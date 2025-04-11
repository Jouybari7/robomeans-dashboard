import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';

function Dashboard() {
  const robotId = 'robot001';
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    const connectSocket = async () => {
      try {
        await Auth.currentSession(); // ensure user is authenticated
        socket.connect();

        socket.on('connect', () => {
          console.log('✅ Connected to WebSocket server');
          socket.emit('register_ui', { robot_id: robotId });
        });

        socket.on('status', (data) => {
          if (data.robot_id === robotId) {
            console.log(`📥 Status update: ${data.status}`);
            setStatus(data.status);
          }
        });

        socket.on('disconnect', () => {
          console.log('❌ Disconnected from WebSocket');
          setStatus('Disconnected');
        });
      } catch (err) {
        console.error('🔐 User not authenticated', err);
      }
    };

    connectSocket();

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendCommand = (command) => {
    socket.emit('command_to_robot', {
      robot_id: robotId,
      command,
    });
    console.log(`📤 Sent: ${command}`);
  };

  const handleSignOut = async () => {
    await Auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Robot: {robotId}</h2>
      <p>Status: {status}</p>
      <button onClick={() => sendCommand('start')}>Start</button>
      <button onClick={() => sendCommand('dock')}>Dock</button>
      <button onClick={() => sendCommand('navigate')}>Navigate</button>
      <button onClick={() => sendCommand('undock')}>Undock</button>
      <br /><br />
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Dashboard;
