import React, { useEffect, useState, useCallback, useRef } from 'react';
import Slider from '../components/Slider';
import yaml from 'js-yaml'; // npm install js-yaml
import JoystickControl from '../components/JoystickControl';
import { useMediaQuery } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { socket } from '../socket';
import { Auth } from 'aws-amplify';
const getButtonStyle  =(label, isDisabled) => {
  const base = {
    width: '100%',
    padding: '5px 4px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    margin: '2px 0',
    display: 'block',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease-in-out',
  };

  const colorMap = {
    Save: { bg: '#00BCD4', text: '#000', border: '#00e5ff' },
    Delete: { bg: '#f44336', text: '#fff', border: '#e53935' },
    Cancel: { bg: '#ff9800', text: '#000', border: '#ffa726' },
    Dock: { bg: '#4CAF50', text: '#000', border: '#66BB6A' },
    Deploy: { bg: '#00BCD4', text: '#000', border: '#00e5ff' }, 
   'Add Mission': { bg: '#00BCD4', text: '#000', border: '#00e5ff' }, // ✅ Add this
  };

  const fallback = { bg: '#37474F', text: '#aaa', border: '#263238' };
  const color = isDisabled ? fallback : colorMap[label] || fallback;

  return {
    ...base,
    backgroundColor: color.bg,
    color: color.text,
    border: `2px solid ${color.border}`,
    opacity: isDisabled ? 0.5 : 1,
  };
};


export default function RobotCard({ robot }) {
  const { robot_id } = robot;

  const [robotState, setRobotState] = useState({});
  const [imageBase64, setImageBase64] = useState('');
  const [missions, setMissions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [pickingPoseRobotId, setPickingPoseRobotId] = useState(null);
  const [mapTimestamp, setMapTimestamp] = useState(Date.now());
  const [originPixels, setOriginPixels] = useState(null);
  const [imgSize, setImgSize] = useState(null);
  const [scaledOriginPixels, setScaledOriginPixels] = useState(null);
  const [robotPosePixels, setRobotPosePixels] = useState(null);
  const [poseStartPixel, setPoseStartPixel] = useState(null);
  const [mousePixel, setMousePixel] = useState(null);
  const [imgOffset, setImgOffset] = useState({ top: 0, left: 0 });

  const mapResolution = 0.05;
  const movementIntervalRef = useRef(null);
  const directionRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isPickingPose = pickingPoseRobotId === robot_id;
  const loading = robotState.loading || false;
  const battery = robotState.battery || 0;
  const connection = robotState.connection === 'connected' ? 'connected' : 'disconnected';

  const missionState = missions;

  const map_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.png?ts=${mapTimestamp}`;
  const yaml_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.yaml?ts=${mapTimestamp}`;
  const isInteractionBlocked = loading || robotState.connection !== 'connected';

  const fetchMissionsFromDB = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const res = await fetch(`https://api.robomeans.com/api/get_missions/${robot_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMissions(data.missions || []);
    } catch (err) {
      console.error(`❌ Failed to fetch missions for ${robot_id}`, err);
    }
  };

  const saveMissionsToDB = async (updatedMissions) => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      const userInfo = await Auth.currentUserInfo();
      const email = userInfo?.attributes?.email;

      await fetch("https://api.robomeans.com/api/save_missions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, robot_id, missions: updatedMissions }),
      });
    } catch (err) {
      console.error(`❌ Failed to save missions for ${robot_id}`, err);
    }
  };

  const sendCommand = (robotId, command) => {
    socket.emit('command_to_robot', {
      robot_id: robotId,
      command,
    });

    if (typeof command === 'string' && (command.startsWith('twist:') || command === 'stop')) return;

    setRobotState(prev => ({
      ...prev,
      loading: true,
      commandInProgress: typeof command === 'string' ? command : command.command,
    }));
  };

    const stopContinuousCommand = useCallback(() => {
    if (movementIntervalRef.current) {
      clearInterval(movementIntervalRef.current);
      movementIntervalRef.current = null;
    }
    if (directionRef.current) {
      sendCommand(robot_id, 'stop');
      directionRef.current = null;
    }
  }, [robot_id]);

    useEffect(() => {
    const eventName = `robot_image_${robot_id}`;
    const handler = (data) => {
      if (data?.robot_id === robot_id) {
        // console.log(`👁️ ${robot_id} image updated:`, data.image_base64?.slice(0, 30));
        setImageBase64(data.image_base64);
      }
    };

    socket.on(eventName, handler);
    console.log(`📡 Subscribed to ${eventName}`);

    return () => {
      socket.off(eventName, handler);
      console.log(`❌ Unsubscribed from ${eventName}`);
    };
  }, [robot_id]);
  
useEffect(() => {
  const eventName = `robot_image_${robot.robot_id}`;
  const handler = (data) => {
    // console.log(`👁️ ${robot.robot_id} image updated:`, data.image_base64?.slice(0, 30));
    setImageBase64(data.image_base64);
  };

  socket.on(eventName, handler);

  // Cleanup on unmount or robot ID change
  return () => {
    socket.off(eventName, handler);
  };
}, [robot.robot_id]);



useEffect(() => {
  const handlePointerUp = () => {
    stopContinuousCommand();
  };

  window.addEventListener('pointerup', handlePointerUp);

  return () => {
    window.removeEventListener('pointerup', handlePointerUp);
  };
}, [stopContinuousCommand]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMapTimestamp(Date.now());
    }, 2000); // 2000 ms = 2 seconds update the map

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

useEffect(() => {
  return () => {
    stopContinuousCommand(); // Stop any ongoing movement when component unmounts
  };
}, [stopContinuousCommand]);


  useEffect(() => {
    const handlePointerUp = () => {
      stopContinuousCommand();
    };
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [stopContinuousCommand]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMapTimestamp(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => stopContinuousCommand, [stopContinuousCommand]);

  useEffect(() => {
    if (pickingPoseRobotId !== robot_id) {
      setPoseStartPixel(null);
      setMousePixel(null);
    }
  }, [pickingPoseRobotId, robot_id]);

  useEffect(() => {
    if (!map_url) return;
    const loadYaml = async () => {
      try {
        const res = await fetch(yaml_url);
        const text = await res.text();
        const data = yaml.load(text);
        if (data?.origin && data.resolution) {
          const [originX, originY] = data.origin;
          const resolution = data.resolution;
          setOriginPixels({
            x: -originX / resolution,
            y: -originY / resolution,
          });
        }
      } catch (err) {
        console.error('Failed to load map.yaml:', err);
      }
    };
    loadYaml();
  }, [map_url, yaml_url]);

  useEffect(() => {
    if (imgSize && originPixels) {
      const scaleX = imgSize.width / imgSize.naturalWidth;
      const scaleY = imgSize.height / imgSize.naturalHeight;
      setScaledOriginPixels({
        x: originPixels.x * scaleX,
        y: imgSize.height - (originPixels.y * scaleY),
      });
    }
  }, [imgSize, originPixels]);

  useEffect(() => {
    if (imgSize && originPixels && robotState.pose && Array.isArray(robotState.pose)) {
      const [x, y, theta] = robotState.pose;
      const scaleX = imgSize.width / imgSize.naturalWidth;
      const scaleY = imgSize.height / imgSize.naturalHeight;
      const posX = (originPixels.x + (x / mapResolution)) * scaleX;
      const posY = imgSize.height - ((originPixels.y + (y / mapResolution)) * scaleY);
      setRobotPosePixels({ x: posX, y: posY, theta });
    }
  }, [imgSize, originPixels, robotState.pose]);

  useEffect(() => {
    const setupSocket = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        const email = userInfo?.attributes?.email;
        socket.emit('register_ui', {
          email,
          robot_ids: [robot_id],
        });


        socket.on('status', (data) => {
          if (data.robot_id !== robot_id) return;
          setRobotState(prev => ({
            ...prev,
            ...data,
            loading: false,
            lastCommand: data.mode || prev.lastCommand,
          }));
        });

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        fetchMissionsFromDB();
      } catch (err) {
        console.error("❌ Socket or Auth error in RobotCard", err);
      }
    };
    setupSocket();
    return () => {
      socket.off(`robot_image_${robot_id}`);
      socket.off('status');
    };
  }, [robot_id]);

  const handleMissionChange = async (robotId, updatedMissions) => {
    setMissions(updatedMissions);
    await saveMissionsToDB(updatedMissions);
  };

  const toggleMissionSelection = (index) => {
    const updated = [...missions];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    handleMissionChange(robot_id, updated);
  };

  const confirmAndRemove = (index) => {
    const confirm = window.confirm(`Are you sure you want to remove mission "${missions[index].name}"?`);
    if (!confirm) return;
    const updated = [...missions];
    updated.splice(index, 1);
    handleMissionChange(robot_id, updated);
  };

  const handleMapClick = (e) => {
    if (!isPickingPose || !imgSize || !originPixels) return;
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (!poseStartPixel) {
      setPoseStartPixel({ x: clickX, y: clickY });
    } else {
      const start = poseStartPixel;
      const end = { x: clickX, y: clickY };
      const scaleX = imgSize.naturalWidth / imgSize.width;
      const scaleY = imgSize.naturalHeight / imgSize.height;
      const mapX_px = start.x * scaleX;
      const mapY_px = imgSize.naturalHeight - (start.y * scaleY);
      const relX = (mapX_px - originPixels.x);
      const relY = (mapY_px - originPixels.y);
      const realX = relX * mapResolution;
      const realY = relY * mapResolution;
      const dx = end.x - start.x;
      const dy = -(end.y - start.y);
      const theta = Math.atan2(dy, dx);
      const name = prompt('Enter mission name:');
      if (name) {
        const newMission = {
          name,
          pose: [
            parseFloat(realX.toFixed(2)),
            parseFloat(realY.toFixed(2)),
            parseFloat(theta.toFixed(2))
          ],
          selected: false,
        };
        handleMissionChange(robot_id, [...missions, newMission]);
      }
      setPickingPoseRobotId(null);
      setPoseStartPixel(null);
      setMousePixel(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!imgSize || !isPickingPose || !poseStartPixel) return;
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - poseStartPixel.x;
    const dy = -(mouseY - poseStartPixel.y);
    const theta = Math.atan2(dy, dx);
    const fixedLength = 30;
    const endX = poseStartPixel.x + fixedLength * Math.cos(theta);
    const endY = poseStartPixel.y - fixedLength * Math.sin(theta);
    setMousePixel({ x: endX, y: endY });
  };
return (
<div style={{
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  width: '99.5%',
  height: '96vh',
  backgroundColor: '#1e1e2f',
  color: '#e0f7fa',
  border: '3px solid #00bcd4',
  borderRadius: '8px',
  overflow: 'hidden',
}}>
    {/* Left Column - Missions */}
    <div style={{
      flex: '1 1 150px',
      maxWidth: '150px',
backgroundColor: '#263238',
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
    }}>
      <div style={{ overflowY: 'auto' }}>
<button
  style={{
    ...getButtonStyle('Add Mission', isInteractionBlocked),
    width: '90%',              // ✅ narrower than full width
    margin: '0 auto 10px',     // ✅ center it and add bottom spacing
  }}  onClick={() => {
    setPickingPoseRobotId(robot_id);
    setPoseStartPixel(null);
    setMousePixel(null);
  }}
  disabled={isInteractionBlocked}
>
  Add Mission
</button>


<h4 style={{ fontSize: '20px', marginBottom: '10px',marginTop: '25px' }}>Missions</h4>
{missionState.length === 0 && <p style={{ fontSize: '10px' }}>No missions yet.</p>}
<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
{missionState.map((mission, index) => (
<div key={index} style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  padding: '8px',
  borderRadius: '6px',
  border: mission.selected ? '2px solid #00e5ff' : '1px solid #00bcd4',
  backgroundColor: mission.selected ? '#008ba3' : '#006978',
  color: '#e0f7fa',
  transition: 'all 0.2s ease-in-out',
}}>


    <input
      type="checkbox"
      checked={mission.selected || false}
      onChange={() => toggleMissionSelection(index)}
      disabled={isInteractionBlocked}
  style={{
    marginRight: '6px',
    transform: 'scale(2)',          // ✅ make checkbox 1.5x larger
    accentColor: '#00bcd4',           // ✅ theme color
    cursor: isInteractionBlocked ? 'not-allowed' : 'pointer',
  }}    />
<span
  style={{
    flex: 1,
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginLeft: '6px', // 👈 Add this line
  }}
>
  {mission.name}
</span><button
  onClick={() => confirmAndRemove(index)}
  disabled={isInteractionBlocked}
  style={{
    background: 'transparent',
    color: '#ff5252',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 6px',
    transition: 'color 0.2s',
  }}
  title="Delete mission"
>
  ❌
</button>
  </div>
))}

        </div>
      </div>

<div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
<button
  style={getButtonStyle('Deploy', loading || robotState.mode_status?.toLowerCase() !== 'navigate')}
  onClick={() => {
    const selectedMissions = missionState.filter((m) => m.selected);
    if (selectedMissions.length === 0) {
      alert('Please select at least one mission to deploy.');
      return;
    }
    sendCommand(robot_id, {
      command: 'deploy',
      missions: selectedMissions.map((m) => ({ name: m.name, pose: m.pose }))
    });
  }}
  disabled={loading || robotState.mode_status?.toLowerCase() !== 'navigate'}
  title={robotState.mode_status?.toLowerCase() !== 'navigate' ? 'Only in Navigate mode' : ''}
>
  Deploy
</button>

</div>

    </div>
    {/* Center Column - Map */}
    
<div style={{
  flex: '1 1 auto',
background: 'linear-gradient(to right, #263238 0%, #37474F 15%, #455A64 35%, #455A64 65%, #37474F 85%, #263238 100%)',
  position: 'relative',
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: isMobile ? '100%' : undefined,
}}>
        <img
          src={map_url}
style={{
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  WebkitMaskImage: 'radial-gradient(ellipse at center, black 85%, transparent 100%)',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskSize: '100% 100%',
  maskImage: 'radial-gradient(ellipse at center, black 85%, transparent 100%)',
  maskRepeat: 'no-repeat',
  maskSize: '100% 100%',
}}
          alt="Robot Map"

          onLoad={(e) => {
  const rect = e.target.getBoundingClientRect();
  setImgSize({
    width: e.target.width,
    height: e.target.height,
    naturalWidth: e.target.naturalWidth,
    naturalHeight: e.target.naturalHeight
  });
const containerRect = e.target.closest('div')?.getBoundingClientRect();
if (containerRect) {
  setImgOffset({
    top: rect.top - containerRect.top,
    left: rect.left - containerRect.left,
  });
}

}}

          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
        />
        {robotState.pose && (
  <div style={{
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 188, 212, 0.2)',
    padding: '6px 10px',
    border: '1px solidrgb(212, 0, 124)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'black',
    zIndex: 10,
  }}>
    <div><strong>Pose:</strong> X={robotState.pose[0]?.toFixed(2)} Y={robotState.pose[1]?.toFixed(2)}</div>
    <div><strong>Theta:</strong> {robotState.pose[2]?.toFixed(2)} rad</div>
    {/* <div><strong>Mode:</strong> {robotState.mode_status || 'N/A'}</div> */}
  </div>
)}


        {/* Origin dot */}
        {scaledOriginPixels && (
          <div style={{
            position: 'absolute',
top: `${scaledOriginPixels.y + imgOffset.top}px`,
left: `${scaledOriginPixels.x + imgOffset.left}px`,

            width: '10px',
            height: '10px',
            backgroundColor: 'red',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            border: '2px solid white',
          }} />
        )}

        {/* Robot pose */}
        {robotPosePixels && (
<svg
  viewBox="0 0 40 40"
  style={{
    position: 'absolute',
    top: `${robotPosePixels.y + imgOffset.top}px`,
    left: `${robotPosePixels.x + imgOffset.left}px`,
    width: '28px',   // increased size
    height: '28px',
    transform: `translate(-50%, -50%) rotate(${-robotPosePixels.theta + Math.PI /2}rad)`,
    transformOrigin: 'center',
    zIndex: 10,
  }}
>
  <polygon
    points="20,0 36,38 20,28 4,38"
    fill="#D32F2F"
    stroke="#B71C1C"
    strokeWidth="1.5"
  />
</svg>


)}
{missionState.length > 0 && imgSize && originPixels && missionState.map((mission, index) => {
  const [x, y, theta] = mission.pose;
  const scaleX = imgSize.width / imgSize.naturalWidth;
  const scaleY = imgSize.height / imgSize.naturalHeight;
  const posX = (originPixels.x + (x / mapResolution)) * scaleX;
  const posY = imgSize.height - ((originPixels.y + (y / mapResolution)) * scaleY);

  const fillColor = '#4CAF50'; // 🔵 Use a single color for all markers

  return (
    <div key={index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg
        viewBox="0 0 40 40"
        style={{
          position: 'absolute',
          top: `${posY + imgOffset.top}px`,
          left: `${posX + imgOffset.left}px`,
          width: '24px',
          height: '24px',
          transform: `translate(-50%, -50%) rotate(${-theta + Math.PI / 2}rad)`,
          transformOrigin: 'center',
          zIndex: 9,
        }}
      >
        <polygon
          points="20,0 36,38 20,28 4,38"
          fill={fillColor}
          stroke="#eeeeee"
          strokeWidth="1"
        />
      </svg>

      {/* Name tag */}
      <div style={{
        position: 'absolute',
        top: `${posY + imgOffset.top + 14}px`,
        left: `${posX + imgOffset.left}px`,
        transform: 'translate(-50%, 0)',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: '#fff',
        padding: '1px 3px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        color: '#000',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}>
        {mission.name}
      </div>
    </div>
  );
})}
        {/* Temporary arrow while drawing new mission */}
        {isPickingPose && poseStartPixel && mousePixel && (
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imgSize?.width || '100%',
            height: imgSize?.height || '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#D32F2F" />
              </marker>
            </defs>
            <line
              x1={poseStartPixel.x+ imgOffset.left}
              y1={poseStartPixel.y+ imgOffset.top}
              x2={mousePixel.x+ imgOffset.left}
              y2={mousePixel.y+ imgOffset.top}
              stroke="#FF5733"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        )}
      </div>

{/* for debuging  */}

{/* <div style={{ padding: '10px', background: '#111', color: '#0f0', fontSize: '12px', overflowX: 'auto' }}>
  <strong>🔍 robotState Debug:</strong>
  <pre>{JSON.stringify(robotState, null, 2)}</pre>
</div> */}



<div style={{
  flex: isMobile ? '1 1 auto' : '1.2 1 300px',
  minWidth: isMobile ? '100%' : '300px',
  maxWidth: isMobile ? '100%' : '300px',
backgroundColor: '#263238',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '6px 8px',
  boxSizing: 'border-box',
  overflowY: 'auto',
}}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '20px', margin: '6px 0' }}> Admin Robot: {robot_id}</h3>
<p style={{ fontSize: '20px', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
  Status:
  {connection === 'connected' ? (
    <span style={{ color: '#00e676', display: 'flex', alignItems: 'center' }}>
      <CheckCircleIcon style={{ fontSize: '22px', marginRight: '4px' }} />
      Connected
    </span>
  ) : (
    <span style={{ color: '#f44336', display: 'flex', alignItems: 'center' }}>
      <CancelIcon style={{ fontSize: '22px', marginRight: '4px' }} />
      Disconnected
    </span>
  )}
</p>

<div style={{ fontSize: '20px', marginTop: '12px', marginBottom: '4px' }}>
  Battery: <strong>{connection === 'connected' && robotState.activation === 1 ? `${battery}%` : 'Unknown'}</strong>
  <div style={{
    height: '20px',
    width: '100%',
    backgroundColor: '#ddd',
    borderRadius: '5px',
    overflow: 'hidden',
    marginTop: '4px'
  }}>
    {connection === 'connected' && robotState.activation === 1 ? (
      <div style={{
        width: `${battery}%`,
        height: '100%',
        backgroundColor:
          battery >= 75 ? '#00e676' :
          battery >= 50 ? '#ff9800' :
          battery >= 20 ? '#ff5722' :
          '#f44336',
        transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out',
        animation: battery < 20 ? 'flashRed 1s infinite' : 'none',
      }} />
    ) : (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#37474F',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#78909C',
        fontSize: '12px'
      }}>
        Not Available
      </div>
    )}
  </div>
</div>
        </div>

{/* Camera centered */}
{!isMobile && (
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: '2px solid #00bcd4',
  borderRadius: '10px',
  backgroundColor: '#000',
  boxShadow: '0 0 8px #00bcd4',
  padding: '4px',
}}>


{imageBase64 ? (
  <img
    src={`data:image/jpeg;base64,${imageBase64}`}
    alt="Robot Camera"
    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
  />
) : (
  <p style={{ textAlign: 'center', marginTop: '50%', color: '#ccc' }}>Waiting for video...</p>
)}
  </div>
)}

{/* Activation Slider */}
<Slider
  options={['Activate', 'Deactivate']}
  value={robotState.activation === 1 ? 'Activate' : 'Deactivate'}
  onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
  disabled={isInteractionBlocked || connection !== 'connected'} // ✅ Deactivate when disconnected

/>

{/* Mode Slider */}
<Slider
  options={['Map', 'Drive', 'Navigate']}
  value={robotState.mode_status ? robotState.mode_status.charAt(0).toUpperCase() + robotState.mode_status.slice(1) : 'Map'}
  onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
disabled={isInteractionBlocked || robotState.activation == 0 || connection !== 'connected'}

  disabledOptions={robotState.dock !== 1 ? ['Navigate', 'Map'] : []}
/>

{/* Joystick centered */}
<div style={{
  width: '130px',
  height: '130px',
  backgroundColor: '#263238',
  border: '2px solid #00BCD4',
  borderRadius: '12px',           // 👈 This makes it square
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  margin: '10px auto',
}}>

  <JoystickControl
    robot_id={robot_id}
    sendCommand={sendCommand}
    disabled={isInteractionBlocked || robotState.activation === 0}
  />
</div>

<div
  style={{
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
    gap: '10px',
    marginTop: '12px',
  }}
>  <button
    style={getButtonStyle('Save', loading || robotState.mode_status?.toLowerCase() !== 'map')}
    onClick={() => sendCommand(robot_id, 'Save')}
    disabled={loading || robotState.mode_status?.toLowerCase() !== 'map'}
    title={robotState.mode_status?.toLowerCase() !== 'map' ? 'Only in Map mode' : ''}
  >
    Save
  </button>

  <button
    style={getButtonStyle('Delete', loading || robotState.mode_status?.toLowerCase() !== 'map')}
    onClick={() => sendCommand(robot_id, 'Delete')}
    disabled={loading || robotState.mode_status?.toLowerCase() !== 'map'}
    title={robotState.mode_status?.toLowerCase() !== 'map' ? 'Only in Map mode' : ''}
  >
    Delete
  </button>

  <button
    style={getButtonStyle('Cancel', loading || robotState.mode_status?.toLowerCase() !== 'navigate')}
    onClick={() => sendCommand(robot_id, 'Cancel')}
    disabled={loading || robotState.mode_status?.toLowerCase() !== 'navigate'}
    title={robotState.mode_status?.toLowerCase() !== 'navigate' ? 'Only in Navigate mode' : ''}
  >
    Cancel
  </button>

  <button
    style={getButtonStyle('Dock', loading || robotState.dock === 1 || robotState.activation === 0 || robotState.mission === 1)}
    onClick={() => sendCommand(robot_id, 'Dock')}
    disabled={loading || robotState.dock === 1 || robotState.activation === 0 || robotState.mission === 1}
  >
    Dock
  </button>
</div>
<div style={{
  fontSize: '30px',
  padding: '6px 10px',
  backgroundColor: '#1A1D1F',
  borderTop: '3px solid #00BCD4',
  textAlign: 'center',
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflowX: 'hidden',     // 🔒 No side scroll
}}>
<strong style={{
  color: connection === 'connected' ? '#B2EBF2' : 'red',
  display: 'inline-block',
  wordWrap: 'break-word',
  whiteSpace: 'normal',
  maxWidth: '100%',
  boxSizing: 'border-box',
  fontSize: 'clamp(14px, 2vw, 18px)', // 👈 Auto-scales
}}>
    {connection === 'connected'
      ? (robotState.message || 'No message')
      : 'Please turn the robot on.'}
  </strong>
</div>
      </div>
    </div>
  </div>
);

}
