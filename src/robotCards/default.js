import React, { useEffect, useState } from 'react';
import Slider from '../components/Slider';
import yaml from 'js-yaml'; // npm install js-yaml

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
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 'bold',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  flex: 1,
  margin: '5px',
};

const buttonColors = {
  save: { backgroundColor: '#4CAF50', color: 'white' },
  delete: { backgroundColor: '#f44336', color: 'white' },
  cancel: { backgroundColor: '#9e9e9e', color: 'white' },
  emergency: { backgroundColor: '#b71c1c', color: 'white' },
};

export default function RobotCard({ robot, sharedProps }) {
  const { robot_id } = robot;
  // const { statuses, robotStates, missions, sendCommand, handleMissionChange } = sharedProps;
  const { statuses, robotStates, missions, sendCommand, handleMissionChange, pickingPoseRobotId, setPickingPoseRobotId, connected } = sharedProps;
  const isPickingPose = pickingPoseRobotId === robot_id;
  const status = statuses[robot_id] || 'Disconnected';
  const robotState = robotStates[robot_id] || {};
  const missionState = missions[robot_id] || [];
  const { loading = false, battery = 0, connection = 'disconnected'} = robotState;
  const map_url  = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.png`;
  const yaml_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.yaml`;
  // const isInteractionBlocked = loading || connection !== 'connected';
  const isInteractionBlocked = loading || !connected;

  const [originPixels, setOriginPixels] = useState(null);
  const [imgSize, setImgSize] = useState(null);
  const [scaledOriginPixels, setScaledOriginPixels] = useState(null);
  const [robotPosePixels, setRobotPosePixels] = useState(null);

  // const [isPickingPose, setIsPickingPose] = useState(false);
  const [poseStartPixel, setPoseStartPixel] = useState(null);
  const [mousePixel, setMousePixel] = useState(null);

  const mapResolution = 0.05; // meters per pixel

  const handleDirection = (direction) => {
    sendCommand(robot_id, { command: 'move', direction });
  };


  const API_URL = "https://api.robomeans.com";  // <--- Change if needed


  const saveMissionsToDB = async () => {
    try {
      const token = localStorage.getItem("token");  // Assuming token is saved
      const selectedMissions = missionState.map(({ name, pose }) => ({ name, pose }));
      await fetch(`${API_URL}/api/save_missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ robot_id, missions: selectedMissions }),
      });
    } catch (error) {
      console.error('Failed to save missions to DB:', error);
    }
  };  



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

  // const handleMapClick = (e) => {
  //   if (!imgSize || !originPixels || !isPickingPose) return;

  //   const rect = e.target.getBoundingClientRect();
  //   const clickX = e.clientX - rect.left;
  //   const clickY = e.clientY - rect.top;

  //   if (!poseStartPixel) {
  //     setPoseStartPixel({ x: clickX, y: clickY });
  //   } else {
  //     const start = poseStartPixel;
  //     const end = { x: clickX, y: clickY };

  //     const scaleX = imgSize.naturalWidth / imgSize.width;
  //     const scaleY = imgSize.naturalHeight / imgSize.height;

  //     const mapX_px = start.x * scaleX;
  //     const mapY_px = imgSize.naturalHeight - (start.y * scaleY);

  //     const relX = (mapX_px - originPixels.x);
  //     const relY = (mapY_px - originPixels.y);

  //     const realX = relX * mapResolution;
  //     const realY = relY * mapResolution;

  //     const dx = end.x - start.x;
  //     const dy = -(end.y - start.y);
  //     const theta = Math.atan2(dy, dx);

  //     const name = prompt('Enter mission name:');
  //     if (name) {
  //       const newMission = {
  //         name,
  //         pose: [parseFloat(realX.toFixed(2)), parseFloat(realY.toFixed(2)), parseFloat(theta.toFixed(2))],
  //         selected: false,
  //       };
  //       handleMissionChange(robot_id, [...missionState, newMission]);
  //     }

  //     setPickingPoseRobotId(null);  // <-- clear picking mode
  //     setPoseStartPixel(null);
  //     setMousePixel(null);
  //   }
  // };
  
  const handleMapClick = (e) => {
    console.log('Map click on', robot_id, {
      isPickingPose, 
      imgSize, 
      originPixels
    });
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
  
      // Clear picking for this robot only if we are still picking
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
      position: 'relative',
      border: '2px solid #444',
      borderRadius: '10px',
      padding: '20px',
      margin: '20px auto',
      maxWidth: '450px',
      background: '#f4f4f4',
      opacity: isInteractionBlocked ? 0.5 : 1,
      // pointerEvents: isInteractionBlocked ? 'none' : 'auto',
    }}>
      <h3>👨‍💼 Admin Robot: {robot_id}</h3>
      <p>Status: <strong style={{ color: connection === 'connected' ? 'green' : 'red' }}>{connection === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}</strong></p>

      <div style={{ marginBottom: '10px' }}>
        🔋 Battery: <strong>{battery}%</strong>
        <div style={{
          height: '10px', width: '100%', backgroundColor: '#ddd',
          borderRadius: '5px', overflow: 'hidden', marginTop: '5px'
        }}>
          <div style={{
            width: `${battery}%`,
            height: '100%',
            backgroundColor: battery > 50 ? '#4CAF50' : battery > 20 ? '#FFC107' : '#f44336',
            transition: 'width 0.3s ease-in-out',
          }} />
        </div>
      </div>

      {map_url && (
        <div style={{ marginTop: '15px', textAlign: 'center', position: 'relative' }}>
          <h4>🗺️ Map</h4>
          {/* <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}> */}
          <div style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
             }}>         
            {/* === Missions Positions with Orientation Arrows === */}
{missionState.length > 0 && imgSize && originPixels && missionState.map((mission, index) => {
  const [x, y, theta] = mission.pose;
  const scaleX = imgSize.width / imgSize.naturalWidth;
  const scaleY = imgSize.height / imgSize.naturalHeight;
  const posX = (originPixels.x + (x / mapResolution)) * scaleX;
  const posY = imgSize.height - ((originPixels.y + (y / mapResolution)) * scaleY);

  const arrowLength = 20; // short arrow
  const endX = posX + arrowLength * Math.cos(theta);
  const endY = posY - arrowLength * Math.sin(theta);

  return (
    <div key={index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* Orange mission point */}
      <div style={{
        position: 'absolute',
        top: `${posY}px`,
        left: `${posX}px`,
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#ffa500',
          borderRadius: '50%',
          border: '1px solid black',
          marginBottom: '2px'
        }} />
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

      {/* Orientation arrow */}
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
          x1={posX}
          y1={posY}
          x2={endX}
          y2={endY}
          stroke="#ffa500"
          strokeWidth="2"
          markerEnd={`url(#arrowhead-mission-${index})`}
        />
      </svg>
    </div>
  );
})}
<img
  src={map_url}
  alt="Robot Map"
  style={{
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'contain',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'crosshair',
  }}
  onLoad={(e) => {
    const img = e.target;
    setImgSize({
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    });
  }}
  onClick={handleMapClick}
  onMouseMove={handleMouseMove}
/>


            {/* Origin */}
            {scaledOriginPixels && (
              <div style={{
                position: 'absolute',
                top: `${scaledOriginPixels.y}px`,
                left: `${scaledOriginPixels.x}px`,
                width: '10px',
                height: '10px',
                backgroundColor: 'red',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px solid white',
              }} />
            )}

            {/* Robot Pose */}
            {robotPosePixels && (
              <div style={{
                position: 'absolute',
                top: `${robotPosePixels.y}px`,
                left: `${robotPosePixels.x}px`,
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

            {/* Arrow while picking */}
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
                  x1={poseStartPixel.x}
                  y1={poseStartPixel.y}
                  x2={mousePixel.x}
                  y2={mousePixel.y}
                  stroke="blue"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Everything continues here with Add Mission, Sliders, D-Pad, Buttons ... */}
      {/* === Add Mission Button === */}
      <button
  onClick={() => {
    setPickingPoseRobotId(robot_id); // set global picking robot
    setPoseStartPixel(null);         // reset local pose
    setMousePixel(null);
  }}
  disabled={isInteractionBlocked}
  style={{ marginTop: '10px' }}
>
  ➕ Add Mission
</button>


      {/* === Sliders === */}
      <Slider
        label="Mode"
        options={['Map', 'Drive', 'Navigate']}
        value={robotState.mode}
        onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
        disabled={isInteractionBlocked}
      />
      <Slider
        label="Homing"
        options={['Undock', 'Dock']}
        value={robotState.dock}
        onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
        disabled={isInteractionBlocked}
      />

      {/* === D-Pad === */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h4>🕹️ Manual Control</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 50px)',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '5px'
        }}>
          <div />
          <button
            onClick={() => handleDirection('forward')}
            disabled={isInteractionBlocked}
            style={buttonStyle}
          >
            ⬆️
          </button>
          <div />
          <button
            onClick={() => handleDirection('left')}
            disabled={isInteractionBlocked}
            style={buttonStyle}
          >
            ⬅️
          </button>
          <button
            onClick={() => handleDirection('stop')}
            disabled={isInteractionBlocked}
            style={buttonStyle}
          >
            ⏹️
          </button>
          <button
            onClick={() => handleDirection('right')}
            disabled={isInteractionBlocked}
            style={buttonStyle}
          >
            ➡️
          </button>
          <div />
          <button
            onClick={() => handleDirection('backward')}
            disabled={isInteractionBlocked}
            style={buttonStyle}
          >
            ⬇️
          </button>
          <div />
        </div>
      </div>

      {/* === Save and Delete Buttons === */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
        <button
          onClick={() => sendCommand(robot_id, 'Save')}
          disabled={loading}
          style={{ ...actionButtonStyle, ...buttonColors.save }}
        >
          💾 Save
        </button>
        <button
          onClick={() => sendCommand(robot_id, 'Delete')}
          disabled={isInteractionBlocked}
          style={{ ...actionButtonStyle, ...buttonColors.delete }}
        >
          🗑️ Delete
        </button>
      </div>

      {/* === Missions List === */}
      <div style={{ marginTop: '20px' }}>
        <h4>Missions</h4>
        {missionState.length === 0 && <p>No missions yet.</p>}
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {missionState.map((mission, index) => (
            <li key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '5px'
            }}>
              <input
                type="checkbox"
                checked={mission.selected || false}
                onChange={() => toggleMissionSelection(index)}
                disabled={isInteractionBlocked}
              />
              <span>🚀 <strong>{mission.name}</strong></span>

              <button
                onClick={() => confirmAndRemove(index)}
                disabled={isInteractionBlocked}
              >
                ❌ Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* === Deploy and Cancel Buttons === */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <button
          onClick={() => {
            const selectedMissions = missionState.filter((m) => m.selected);
            if (selectedMissions.length === 0) {
              alert('Please select at least one mission to deploy.');
              return;
            }
            const deployData = {
              command: 'deploy',
              missions: selectedMissions.map((m) => ({
                name: m.name,
                pose: m.pose,
              })),
            };
            sendCommand(robot_id, deployData);
          }}
          disabled={isInteractionBlocked}
          style={{ ...actionButtonStyle, backgroundColor: '#2196f3', color: 'white' }}
        >
          🚀 Deploy
        </button>

        <button
          onClick={() => sendCommand(robot_id, 'Cancel')}
          disabled={isInteractionBlocked}
          style={{ ...actionButtonStyle, ...buttonColors.cancel }}
        >
          ✖️ Cancel
        </button>
      </div>

      {/* === Emergency Stop Button === */}
      <button
        onClick={() => sendCommand(robot_id, 'EMERGENCY_STOP')}
        disabled={isInteractionBlocked}
        style={{
          ...actionButtonStyle,
          ...buttonColors.emergency,
          marginTop: '20px',
          width: '100%',
          fontSize: '16px',
          padding: '14px 0',
        }}
      >
        🔴 EMERGENCY STOP
      </button>

    </div>
  );
}
