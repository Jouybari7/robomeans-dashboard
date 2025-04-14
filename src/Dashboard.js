import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';

function Dashboard() {
  const [robotIds, setRobotIds] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connectSocketAndFetchRobots = async () => {
      try {
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();

        // const res = await fetch('http://3.98.138.140:8000/api/myrobots', {
          const response = await fetch("https://api.robomeans.com/api/myrobots", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error("❌ API returned unexpected data:", data);
          setRobotIds([]);
          return;
        }

        setRobotIds(data);

        socket.connect();

        socket.on('connect', () => {
          console.log('✅ Connected to WebSocket server');

          data.forEach((robotId) => {
            console.log(`📡 Registering robot: ${robotId}`);
            socket.emit('register_ui', { robot_id: robotId });
          });

          setConnected(true);
        });

        socket.on('status', (data) => {
          const { robot_id, status } = data;
          setStatuses((prev) => ({ ...prev, [robot_id]: status }));
        });

        socket.on('disconnect', () => {
          console.log('❌ Disconnected from WebSocket');
          setConnected(false);
        });
      } catch (err) {
        console.error('🔐 Auth error or fetch failed:', err);
      }
    };

    connectSocketAndFetchRobots();

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendCommand = (robotId, command) => {
    socket.emit('command_to_robot', {
      robot_id: robotId,
      command,
    });
    console.log(`📤 Sent "${command}" to ${robotId}`);
  };

  const handleSignOut = async () => {
    await Auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Your Robots</h2>
      {!connected && <p>Connecting to robots...</p>}
      {robotIds.length === 0 ? (
        <p>Loading robots...</p>
      ) : (
        robotIds.map((robotId) => (
          <div
            key={robotId}
            style={{
              border: '1px solid #aaa',
              borderRadius: '8px',
              padding: '15px',
              margin: '20px auto',
              maxWidth: '350px',
            }}
          >
            <h3>Robot: {robotId}</h3>
            <p>Status: {statuses[robotId] || 'Disconnected'}</p>
            <button onClick={() => sendCommand(robotId, 'start')}>Start</button>
            <button onClick={() => sendCommand(robotId, 'dock')}>Dock</button>
            <button onClick={() => sendCommand(robotId, 'navigate')}>Navigate</button>
            <button onClick={() => sendCommand(robotId, 'undock')}>Undock</button>
          </div>
        ))
      )}
      <br />
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Dashboard;
