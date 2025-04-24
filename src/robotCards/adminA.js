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
  const missionState = missions[robot_id] || Array(10).fill(false);
  const { loading, battery = 0 } = robotState;

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
      {/* <p>Status: {status}</p> */}
      <p>Status: <strong style={{ color: robotState.connection === 'connected' ? 'green' : 'red' }}>
      {robotState.connection === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
      </strong></p>

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
        <h4>Manual Control</h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            justifyItems: 'center',
            alignItems: 'center',
            width: '200px',
            margin: '0 auto',
          }}
        >
          <div></div>
          <button onClick={() => sendCommand(robot_id, 'Forward')} disabled={loading} style={buttonStyle}>
            ↑
          </button>
          <div></div>

          <button onClick={() => sendCommand(robot_id, 'Left')} disabled={loading} style={buttonStyle}>
            ←
          </button>
          <div></div>
          <button onClick={() => sendCommand(robot_id, 'Right')} disabled={loading} style={buttonStyle}>
            →
          </button>

          <div></div>
          <button onClick={() => sendCommand(robot_id, 'Backward')} disabled={loading} style={buttonStyle}>
            ↓
          </button>
          <div></div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4>Mission</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
          {missionState.map((checked, index) => (
            <label key={index}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleMissionChange(robot_id, index)}
                disabled={loading}
              />
              #{index + 1}
            </label>
          ))}
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
