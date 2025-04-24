import React from 'react';
import Slider from '../components/Slider';

export default function renderRobotCard(robot, sharedProps) {
  const { robot_id } = robot;
  const { statuses, robotStates, missions, sendCommand, handleMissionChange } = sharedProps;
  const status = statuses[robot_id] || 'Disconnected';
  const robotState = robotStates[robot_id] || {};
  const missionState = missions[robot_id] || Array(10).fill(false);
  const { loading } = robotState;

  return (
    <div key={robot_id} style={{ border: '2px solid #444', borderRadius: '10px', padding: '20px', margin: '20px auto', maxWidth: '450px', background: '#f4f4f4', opacity: loading ? 0.5 : 1 }}>
      <h3>👨‍💼 User Robot: {robot_id}</h3>
      <p>Status: {status}</p>

      <Slider label="Robot" options={['Deactivate', 'Activate']} onChange={(opt) => sendCommand(robot_id, opt === 'Activate' ? 'start' : 'stop')} disabled={loading} />

      <div style={{ marginTop: '20px' }}>
        <h4>Mission</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
          {missionState.map((checked, index) => (
            <label key={index}>
              <input type="checkbox" checked={checked} onChange={() => handleMissionChange(robot_id, index)} disabled={loading} />
              #{index + 1}
            </label>
          ))}
        </div>
        <button onClick={() => sendCommand(robot_id, 'deploy')} disabled={loading} style={{ marginTop: '10px' }}>
          Deploy
        </button>
      </div>
    </div>
  );
}
