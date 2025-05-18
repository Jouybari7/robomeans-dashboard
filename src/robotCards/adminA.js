import React, { useEffect, useState, useCallback, useRef } from 'react';
import Slider from '../components/Slider';
import yaml from 'js-yaml'; // npm install js-yaml
import RobotCamera from '../components/RobotCamera';
import { Joystick } from 'react-joystick-component';

const buttonStyle = {
  padding: '10px 15px',
  fontSize: '18px',
  borderRadius: '8px',
  border: '1px solid #888',
  backgroundColor: '#e0e0e0',
  cursor: 'pointer',
  minWidth: '50px',
  minHeight: '50px',
  textAlign: 'center',
};

const actionButtonStyle = {
  width: '500px',
  height: '50px',
  padding: '10px 15px',
  fontSize: '14px',
  fontWeight: 'bold',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: '#1E90FF',
  flex: 1,
  margin: '5px',
};

export default function RobotCard({ robot, sharedProps }) {
  const { robot_id } = robot;
  // const { statuses, robotStates, missions, sendCommand, handleMissionChange, pickingPoseRobotId, setPickingPoseRobotId, connected } = sharedProps;
  const { robotStates, missions, sendCommand, handleMissionChange, pickingPoseRobotId, setPickingPoseRobotId, connected } = sharedProps;
  const isPickingPose = pickingPoseRobotId === robot_id;
  // const status = statuses[robot_id] || 'Disconnected';
  const robotState = robotStates[robot_id] || {};
  const missionState = missions[robot_id] || [];
  const { loading = false, battery = 0, connection = 'disconnected'} = robotState;
  const [mapTimestamp, setMapTimestamp] = useState(Date.now());
  const [originPixels, setOriginPixels] = useState(null);
  const [imgSize, setImgSize] = useState(null);
  const [scaledOriginPixels, setScaledOriginPixels] = useState(null);
  const [robotPosePixels, setRobotPosePixels] = useState(null);
  const [poseStartPixel, setPoseStartPixel] = useState(null);
  const [mousePixel, setMousePixel] = useState(null);
  const mapResolution = 0.05; // meters per pixel
  // const API_URL = "https://api.robomeans.com";  // <--- Change if needed
  const [imgOffset, setImgOffset] = useState({ top: 0, left: 0 });
  const movementIntervalRef = useRef(null);
  const directionRef = useRef(null);
  const joystickIntervalRef = useRef(null);
  const latestTwistRef = useRef({ linear: 0, angular: 0 });


  

const stopContinuousCommand = useCallback(() => {
  if (movementIntervalRef.current) {
    clearInterval(movementIntervalRef.current);
    movementIntervalRef.current = null;
  }

  if (directionRef.current) {
    sendCommand(robot_id, 'stop'); // tell robot to stop
    directionRef.current = null;
  }
}, [robot_id, sendCommand]);


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

  const map_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.png?ts=${mapTimestamp}`;
  const yaml_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.yaml?ts=${mapTimestamp}`;
  const isInteractionBlocked = loading || !connected;

const startContinuousCommand = (direction) => {
  // Clear any running interval
  if (movementIntervalRef.current) {
    clearInterval(movementIntervalRef.current);
    movementIntervalRef.current = null;
  }

  directionRef.current = direction;
  sendCommand(robot_id, direction); // send immediately

  movementIntervalRef.current = setInterval(() => {
    sendCommand(robot_id, direction);
  }, 100);
};




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
      setRobotPosePixels({
        x: posX,
        y: posY,
        theta: theta,
      });
    }
  }, [imgSize, originPixels, robotState.pose]);

  // === Next: ALL handlers, mission toggle, confirmAndRemove, handleMapClick, handleMouseMove ===

  const toggleMissionSelection = (index) => {
    const updated = [...missionState];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    handleMissionChange(robot_id, updated);
  };

  const confirmAndRemove = (index) => {
    const confirm = window.confirm(`Are you sure you want to remove mission "${missionState[index].name}"?`);
    if (!confirm) return;
    const updated = [...missionState];
    updated.splice(index, 1);
    handleMissionChange(robot_id, updated);
  };

  const handleMapClick = (e) => {
    console.log('Map click on', robot_id, { isPickingPose, imgSize, originPixels });
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
        handleMissionChange(robot_id, [...missionState, newMission]);
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
    border: '5px solid #444',
    borderRadius: '5px',
    padding: '0px',
    margin: '10px auto',
    maxWidth: '95vw',
    height: '95vh',
    boxSizing: 'border-box',
  }}>
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      
      {/* Left Column - Missions */}
<div style={{
  flex: 1,
  backgroundColor: '#f4f4f4',
  padding: '10px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}}>
  {/* Top Section - Add and List Missions */}
  <div style={{ overflowY: 'auto' }}>
    <button
      style={{ ...buttonStyle, fontSize: '12px', marginBottom: '6px' }}
      onClick={() => {
        setPickingPoseRobotId(robot_id);
        setPoseStartPixel(null);
        setMousePixel(null);
      }}
      disabled={isInteractionBlocked}
    >
      ➕ Add Mission
    </button>

    <h4 style={{ fontSize: '12px', margin: '4px 0' }}>Missions</h4>
    {missionState.length === 0 && <p style={{ fontSize: '10px' }}>No missions yet.</p>}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {missionState.map((mission, index) => (
        <div key={index} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10px',
          border: '1px solid #ccc',
          padding: '4px 6px',
          borderRadius: '4px',
        }}>
          <input
            type="checkbox"
            checked={mission.selected || false}
            onChange={() => toggleMissionSelection(index)}
            disabled={isInteractionBlocked}
          />
          <span style={{ marginLeft: '4px', flex: 1 }}>{mission.name}</span>
          <button onClick={() => confirmAndRemove(index)} disabled={isInteractionBlocked}>❌</button>
        </div>
      ))}
    </div>
  </div>

  {/* Bottom Section - Deploy Button */}
  <div style={{ paddingBottom: '10px' }}>
    <button
      style={{
        ...actionButtonStyle,
        opacity: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 0.5 : 1,
        cursor: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 'not-allowed' : 'pointer',
        width: '100%',
      }}
      onClick={() => sendCommand(robot_id, 'Deploy')}
      disabled={loading || robotState.mode_status?.toLowerCase() !== 'navigate'}
      title={robotState.mode_status?.toLowerCase() !== 'navigate' ? 'Only in Navigate mode' : ''}
    >
      Deploy
    </button>
  </div>
</div>
      {/* Center Column - Map */}
      <div style={{
        flex: 12,
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'auto',
      }}>
        <img
          src={map_url}
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
  <div style={{
    position: 'absolute',
    top: `${robotPosePixels.y + imgOffset.top}px`,
    left: `${robotPosePixels.x + imgOffset.left}px`,
    width: '14px',
    height: '14px',
    backgroundColor: 'blue',
    borderRadius: '50%',
    transform: `translate(-50%, -50%) rotate(${robotPosePixels.theta}rad)`,
    transformOrigin: 'center',
    border: '2px solid white',
  }}>
    <div style={{
      width: '2px',
      height: '6px',
      backgroundColor: 'white',
      position: 'absolute',
      top: '2px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: '2px',
    }} />
  </div>
)}
        {/* Mission arrows */}
        {missionState.length > 0 && imgSize && originPixels && missionState.map((mission, index) => {
          const [x, y, theta] = mission.pose;
          const scaleX = imgSize.width / imgSize.naturalWidth;
          const scaleY = imgSize.height / imgSize.naturalHeight;
          const posX = (originPixels.x + (x / mapResolution)) * scaleX;
          const posY = imgSize.height - ((originPixels.y + (y / mapResolution)) * scaleY);
          const arrowLength = 20;
          const endX = posX + arrowLength * Math.cos(theta);
          const endY = posY - arrowLength * Math.sin(theta);
          return (
            <div key={index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute',
                top: `${posY+ imgOffset.top}px`,
                left: `${posX+ imgOffset.left}px`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  backgroundColor: 'white',
                  padding: '1px 2px',
                  borderRadius: '3px',
                  border: '1px solid #ccc',
                  whiteSpace: 'nowrap',
                  marginTop: '2px'
                }}>
                  {mission.name}
                </div>
              </div>
              <svg style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
              }}>
                <defs>
                  <marker id={`arrowhead-mission-${index}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#ffa500" />
                  </marker>
                </defs>
                <line
                  x1={posX+ imgOffset.left}
                  y1={posY+ imgOffset.top}
                  x2={endX+ imgOffset.left}
                  y2={endY+ imgOffset.top}
                  stroke="#ffa500"
                  strokeWidth="2"
                  markerEnd={`url(#arrowhead-mission-${index})`}
                />
              </svg>
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
                <polygon points="0 0, 10 3.5, 0 7" fill="#00f" />
              </marker>
            </defs>
            <line
              x1={poseStartPixel.x+ imgOffset.left}
              y1={poseStartPixel.y+ imgOffset.top}
              x2={mousePixel.x+ imgOffset.left}
              y2={mousePixel.y+ imgOffset.top}
              stroke="blue"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        )}
      </div>

{/* Right Column - Info, Camera, Controls */}
<div style={{
  flex: 3,
  backgroundColor: '#f4f4f4',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '10px',
  boxSizing: 'border-box',
  overflowY: 'auto',
}}>
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
    
    {/* Robot Info */}
    <div>
      <h3 style={{ fontSize: '20px', margin: '2px 0' }}>👨‍💼 Admin Robot: {robot_id}</h3>
      <p style={{ fontSize: '20px', margin: '2px 0' }}>
        Status: <strong style={{ color: connection === 'connected' ? 'green' : 'red' }}>
          {connection === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
        </strong>
      </p>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>
        🔋 Battery: <strong>{battery}%</strong>
        <div style={{
          height: '20px',
          width: '100%',
          backgroundColor: '#ddd',
          borderRadius: '5px',
          overflow: 'hidden',
          marginTop: '2px'
        }}>
          <div style={{
            width: `${battery}%`,
            height: '100%',
            backgroundColor: battery > 50 ? '#4CAF50' : battery > 20 ? '#FFC107' : '#f44336',
            transition: 'width 0.3s ease-in-out',
          }} />
        </div>
      </div>
    </div>

    {/* Camera */}
    <RobotCamera robotId={robot_id} />

    {/* Mode Slider */}
    <Slider
      options={['Map', 'Drive', 'Navigate']}
      value={robotState.mode_status ? robotState.mode_status.charAt(0).toUpperCase() + robotState.mode_status.slice(1) : 'Map'}
      onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
      disabled={isInteractionBlocked}
    />

    {/* D-Pad Controls */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 30px)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '2px',
      marginTop: '4px'
    }}>
      {/* <div />
      <button onPointerDown={() => startContinuousCommand('forward')}    disabled={isInteractionBlocked} style={{ ...buttonStyle }}>⬆️</button>
      <div />
      <button onPointerDown={() => startContinuousCommand('left')}       disabled={isInteractionBlocked} style={{ ...buttonStyle }}>⬅️</button>
      <div />
      <button onPointerDown={() => startContinuousCommand('right')}      disabled={isInteractionBlocked} style={{ ...buttonStyle }}>➡️</button>
      <div />
      <button onPointerDown={() => startContinuousCommand('backward')}   disabled={isInteractionBlocked} style={{ ...buttonStyle }}>⬇️</button>
      <div /> */}

      <Joystick
  size={100}
  baseColor="#ccc"
  stickColor="#888"
  move={(e) => {
    const maxSpeed = 0.5;
    const linear = -(e.y * -maxSpeed).toFixed(2);
    const angular = -(e.x * maxSpeed).toFixed(2);

    // Update latest values in ref
    latestTwistRef.current = { linear, angular };

    // Start sending only once
    if (!joystickIntervalRef.current) {
      joystickIntervalRef.current = setInterval(() => {
        const { linear, angular } = latestTwistRef.current;
        sendCommand(robot_id, `twist:${linear},${angular}`);
      }, 100); // 10 Hz
    }
  }}
  stop={() => {
    // Stop movement and interval
    latestTwistRef.current = { linear: 0, angular: 0 };
    sendCommand(robot_id, 'twist:0,0');

    if (joystickIntervalRef.current) {
      clearInterval(joystickIntervalRef.current);
      joystickIntervalRef.current = null;
    }
  }}
/>

    </div>

    {/* Action Buttons */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
      <button
        style={{
          ...actionButtonStyle,
          opacity: loading || robotState.mode_status?.toLowerCase() !== 'map' ? 0.5 : 1,
          cursor: loading || robotState.mode_status?.toLowerCase() !== 'map' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => sendCommand(robot_id, 'Save')}
        disabled={loading || robotState.mode_status?.toLowerCase() !== 'map'}
        title={robotState.mode_status?.toLowerCase() !== 'map' ? 'Only in Map mode' : ''}
      >
        Save
      </button>

      <button
        style={{
          ...actionButtonStyle,
          opacity: loading || robotState.mode_status?.toLowerCase() !== 'map' ? 0.5 : 1,
          cursor: loading || robotState.mode_status?.toLowerCase() !== 'map' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => sendCommand(robot_id, 'Delete')}
        disabled={loading || robotState.mode_status?.toLowerCase() !== 'map'}
        title={robotState.mode_status?.toLowerCase() !== 'map' ? 'Only in Map mode' : ''}
      >
        Delete
      </button>

      <button
        style={{
          ...actionButtonStyle,
          opacity: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 0.5 : 1,
          cursor: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => sendCommand(robot_id, 'Cancel')}
        disabled={loading || robotState.mode_status?.toLowerCase() !== 'navigate'}
        title={robotState.mode_status?.toLowerCase() !== 'navigate' ? 'Only in Navigate mode' : ''}
      >
        Cancel
      </button>

      <button
        style={{
          ...actionButtonStyle,
          opacity: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 0.5 : 1,
          cursor: loading || robotState.mode_status?.toLowerCase() !== 'navigate' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => sendCommand(robot_id, 'Home')}
        disabled={loading || robotState.mode_status?.toLowerCase() !== 'navigate'}
        title={robotState.mode_status?.toLowerCase() !== 'navigate' ? 'Only in Navigate mode' : ''}
      >
        Home
      </button>

      <button
        style={{
          ...actionButtonStyle,
          opacity: loading || robotState.mode_status?.toLowerCase() === 'map' ? 0.5 : 1,
          cursor: loading || robotState.mode_status?.toLowerCase() === 'map' ? 'not-allowed' : 'pointer',
        }}
        onClick={() => sendCommand(robot_id, 'Dock')}
        disabled={loading || robotState.mode_status?.toLowerCase() === 'map'}
        title={robotState.mode_status?.toLowerCase() === 'map' ? 'Only in Navigate mode' : ''}
      >
        Dock
      </button>
    </div>

    {/* Message Box */}
<div style={{
  fontSize: '16px',
  marginTop: '10px',
  padding: '6px 12px',
  backgroundColor: '#f0f0f0',
  borderTop: '2px solid #ccc',
  textAlign: 'center',
}}>
  <strong>Status:</strong> {robotState.mode_status || 'N/A'}
</div>
  </div>
</div>
    </div>
  </div>
);

}
