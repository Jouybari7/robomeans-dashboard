import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';

function Dashboard() {
  const [robots, setRobots] = useState([]); // Array of { robot_id, ui_type }
  const [statuses, setStatuses] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connectSocketAndFetchRobots = async () => {
      try {
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();

        const response = await fetch("https://api.robomeans.com/api/myrobots", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();
        if (!Array.isArray(data.robots)) {
          console.error("❌ API returned unexpected data:", data);
          setRobots([]);
          return;
        }

        setRobots(data.robots);

        const userInfo = await Auth.currentUserInfo();
        const email = userInfo?.attributes?.email;

        socket.connect();

        socket.on('connect', () => {
          console.log('✅ Connected to WebSocket server');

          socket.emit('register_ui', {
            email,
            robot_ids: data.robots.map(r => r.robot_id),
          });

          setConnected(true);
        });

        socket.on('status', (data) => {
          const { robot_id, status } = data;
          setStatuses(prev => ({ ...prev, [robot_id]: status }));
        });

        socket.on('disconnect', () => {
          console.log('❌ Disconnected from WebSocket');
          setConnected(false);
        });

        socket.on('force_logout', () => {
          alert("⚠️ You've been logged out because your account was used on another device.");
          Auth.signOut().then(() => window.location.reload());
        });

      } catch (err) {
        console.error('🔐 Auth error or fetch failed:', err);
      }
    };

    connectSocketAndFetchRobots();
    return () => socket.disconnect();
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

  const renderRobotCard = ({ robot_id, ui_type }) => {
    const status = statuses[robot_id] || 'Disconnected';

    return (
      <div
        key={robot_id}
        style={{
          border: '1px solid #aaa',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px auto',
          maxWidth: '350px',
        }}
      >
        <h3>Robot: {robot_id}</h3>
        <p>Status: {status}</p>
        <p>UI Type: {ui_type}</p>

        {ui_type === 'userA' && (
          <button onClick={() => sendCommand(robot_id, 'start')}>Start</button>
        )}

        {ui_type === 'adminA' && (
          <>
            <button onClick={() => sendCommand(robot_id, 'dock')}>Dock</button>
            <button onClick={() => sendCommand(robot_id, 'navigate')}>Navigate</button>
            <button onClick={() => sendCommand(robot_id, 'undock')}>Undock</button>
          </>
        )}

        {ui_type === 'default' && (
          <>
            <button onClick={() => sendCommand(robot_id, 'start')}>Start</button>
            <button onClick={() => sendCommand(robot_id, 'dock')}>Dock</button>
            <button onClick={() => sendCommand(robot_id, 'navigate')}>Navigate</button>
            <button onClick={() => sendCommand(robot_id, 'undock')}>Undock</button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Your Robots</h2>
      {!connected && <p>Connecting to robots...</p>}
      {robots.length === 0 ? (
        <p>Loading robots...</p>
      ) : (
        robots.map(renderRobotCard)
      )}
      <br />
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Dashboard;
