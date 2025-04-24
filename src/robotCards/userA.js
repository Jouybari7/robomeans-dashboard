import React from 'react';
import Slider from '../components/Slider';

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

export default function renderRobotCard(robot, sharedProps) {
  const { robot_id } = robot;
  const { statuses, robotStates, missions, sendCommand, handleMissionChange } = sharedProps;
  const status = statuses[robot_id] || 'Disconnected';
  const robotState = robotStates[robot_id] || {};
  const missionState = missions[robot_id] || []; // [{ name, pose, selected }]
  const { loading, battery = 0, connection = 'disconnected' } = robotState;

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

  return (
    <div
      key={robot_id}
      style={{
        border: '2px solid #444',
        borderRadius: '10px',
        padding: '20px',
        margin: '20px auto',
        maxWidth: '450px',
        background: '#f4f4f4',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <h3>👨‍💼 Admin Robot: {robot_id}</h3>
      <p>
        Status:{' '}
        <strong style={{ color: connection === 'connected' ? 'green' : 'red' }}>
          {connection === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
        </strong>
      </p>

      <div style={{ marginBottom: '10px' }}>
        🔋 Battery: <strong>{battery}%</strong>
        <div
          style={{
            height: '10px',
            width: '100%',
            backgroundColor: '#ddd',
            borderRadius: '5px',
            overflow: 'hidden',
            marginTop: '5px',
          }}
        >
          <div
            style={{
              width: `${battery}%`,
              height: '100%',
              backgroundColor:
                battery > 50 ? '#4CAF50' : battery > 20 ? '#FFC107' : '#f44336',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
      </div>

      <Slider
        label="Mode"
        options={['Map', 'Drive', 'Navigate']}
        value={robotState.mode}
        onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
        disabled={loading}
      />
      <Slider
        label="Homing"
        options={['Undock', 'Dock']}
        value={robotState.dock}
        onChange={(opt) => sendCommand(robot_id, opt.toLowerCase())}
        disabled={loading}
      />

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
          disabled={loading}
          style={{ ...actionButtonStyle, ...buttonColors.delete }}
        >
          🗑️ Delete
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Missions</h4>

        {missionState.length === 0 && <p>No missions yet.</p>}

        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {missionState.map((mission, index) => (
            <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <input
                type="checkbox"
                checked={mission.selected || false}
                onChange={() => toggleMissionSelection(index)}
                disabled={loading}
              />
              <span>🚀 <strong>{mission.name}</strong></span>
              <code style={{ fontSize: '0.9em' }}>{JSON.stringify(mission.pose)}</code>
              <button onClick={() => confirmAndRemove(index)} disabled={loading}>❌ Remove</button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => {
            const name = prompt("Enter mission name:");
            if (!name) return;

            const poseStr = prompt("Enter pose as 5 comma-separated numbers (e.g. 1.0,2.0,3.0,0,1):");
            const pose = poseStr?.split(',').map(Number);
            if (!pose || pose.length !== 5 || pose.some(isNaN)) {
              alert("Invalid pose format.");
              return;
            }

            const newMission = { name, pose, selected: false };
            handleMissionChange(robot_id, [...missionState, newMission]);
          }}
          disabled={loading}
          style={{ marginTop: '10px' }}
        >
          ➕ Add Mission
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <button
          onClick={() => sendCommand(robot_id, 'deploy')}
          disabled={loading}
          style={{ ...actionButtonStyle, backgroundColor: '#2196f3', color: 'white' }}
        >
          🚀 Deploy
        </button>
        <button
          onClick={() => sendCommand(robot_id, 'Cancel')}
          disabled={loading}
          style={{ ...actionButtonStyle, ...buttonColors.cancel }}
        >
          ✖️ Cancel
        </button>
      </div>

      <button
        onClick={() => sendCommand(robot_id, 'EMERGENCY_STOP')}
        disabled={loading}
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
