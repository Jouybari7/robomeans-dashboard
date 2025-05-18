import React, { useEffect, useState } from 'react';
import Slider from '../components/Slider';
import yaml from 'js-yaml'; // npm install js-yaml
import RobotCamera from '../components/RobotCamera';


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
  width: '50px',
  height: '50px',
  padding: '10px 15px',
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
  const [mapTimestamp, setMapTimestamp] = useState(Date.now());


  useEffect(() => {
  const handleGlobalMouseUp = () => {
    stopContinuousCommand();
  };

  document.addEventListener('mouseup', handleGlobalMouseUp);

  return () => {
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  };
}, []);

useEffect(() => {
    const interval = setInterval(() => {
      setMapTimestamp(Date.now());
    }, 2000); // 2000 ms = 2 seconds update the map

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  const map_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.png?ts=${mapTimestamp}`;
  const yaml_url = `https://robomeans-robot-maps.s3.ca-central-1.amazonaws.com/${robot_id}/map.yaml?ts=${mapTimestamp}`;
  const isInteractionBlocked = loading || !connected;
  const [originPixels, setOriginPixels] = useState(null);
  const [imgSize, setImgSize] = useState(null);
  const [scaledOriginPixels, setScaledOriginPixels] = useState(null);
  const [robotPosePixels, setRobotPosePixels] = useState(null);
  const [poseStartPixel, setPoseStartPixel] = useState(null);
  const [mousePixel, setMousePixel] = useState(null);
  const mapResolution = 0.05; // meters per pixel
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

const [movementInterval, setMovementInterval] = useState(null);

const startContinuousCommand = (direction) => {
  if (movementInterval) return;  // Prevent multiple intervals

  sendCommand(robot_id,  direction );  // Immediate send

  const interval = setInterval(() => {
  sendCommand(robot_id, direction);
  }, 100);  // Still every 100ms, but smoother

  setMovementInterval(interval);
};

const stopContinuousCommand = () => {
  if (movementInterval) {
    clearInterval(movementInterval);
    setMovementInterval(null);
  }
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


}
