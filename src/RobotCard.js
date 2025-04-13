import React, { useEffect, useState } from 'react';
import { socket } from './socket';

function RobotCard({ robotId }) {
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log(`✅ Connected: ${robotId}`);
      socket.emit('register_robot', { robot_id: robotId });
    });

    socket.on('status', (data) => {
      if (data.robot_id === robotId) {
        setStatus(data.status);
      }
    });

    return () => {
      socket.off('status');
    };
  }, [robotId]);

  const sendCommand = (command) => {
    socket.emit('command_to_robot', {
      robot_id: robotId,
      command,
    });
  };

  return (
    <div style={{ border: '1px solid gray', margin: '10px', padding: '10px' }}>
      <h3>{robotId}</h3>
      <p>Status: {status}</p>
      <button onClick={() => sendCommand('start')}>Start</button>
      <button onClick={() => sendCommand('dock')}>Dock</button>
      <button onClick={() => sendCommand('navigate')}>Navigate</button>
      <button onClick={() => sendCommand('undock')}>Undock</button>
    </div>
  );
}

export default RobotCard;
