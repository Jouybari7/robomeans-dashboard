import React from 'react';
import axios from 'axios';

const ControlPanel = ({ robotId }) => {
  const sendCommand = async (action) => {
    const url = `https://18.220.132.145/api/${robotId}/${action}`;
    try {
      const response = await axios.post(url);
      alert(`${action} sent to ${robotId}`);
      console.log(response.data);
    } catch (err) {
      alert(`Failed to send ${action}: ${err.message}`);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h4>Robot Controls</h4>
      <button onClick={() => sendCommand('start')}>Start</button>
      <button onClick={() => sendCommand('navigate')}>Navigate</button>
      <button onClick={() => sendCommand('dock')}>Dock</button>
      <button onClick={() => sendCommand('undock')}>Undock</button>
    </div>
  );
};

export default ControlPanel;
