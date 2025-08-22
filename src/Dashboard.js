import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';

function Dashboard() {
  const [robots, setRobots] = useState([]);
  const [cardModules, setCardModules] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connectSocketAndFetchRobots = async () => {
      try {
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();

        const response = await fetch("https://api.robomeans.com/api/myrobots", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await response.json();
        if (!Array.isArray(data.robots)) {
          console.error("❌ API returned unexpected data:", data);
          setRobots([]);
          return;
        }

        // Load card modules
        const modules = {};
        for (const robot of data.robots) {
          const uiType = robot.ui_type || 'default';
          if (!modules[uiType]) {
            try {
              const module = await import(`./robotCards/${uiType}.js`);
              modules[uiType] = module.default;
            } catch (e) {
              const fallback = await import(`./robotCards/default.js`);
              modules[uiType] = fallback.default;
            }
          }
        }

        setCardModules(modules);
        setRobots(data.robots);

        // Socket connection
        socket.connect();
        socket.on('connect', async () => {
          console.log('✅ Connected to WebSocket server');
          setConnected(true);

          const session = await Auth.currentSession();
          const email = session.getIdToken().payload.email;
          const robotIds = data.robots.map(r => r.robot_id);

          console.log("📤 Registering UI with:", { email, robotIds });
          socket.emit('register_ui', { email, robot_ids: robotIds });
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('force_logout', () => {
          alert("⚠️ You've been logged out.");
          Auth.signOut().then(() => window.location.reload());
        });

      } catch (err) {
        console.error('🔐 Auth error or fetch failed:', err);
      }
    };

    connectSocketAndFetchRobots();
    return () => socket.disconnect();
  }, []);

  const handleSignOut = async () => {
    await Auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '20px',
        background: 'linear-gradient(to right, #2c3e50, #3498db)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          Welcome to Robomeans Dashboard
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => window.open('http://10.42.0.1/', '_blank')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(0, 188, 212, 0.2)',
              border: '2px solid #00bcd4',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              ':hover': {
                backgroundColor: 'rgba(0, 188, 212, 0.3)'
              }
            }}
          >
            Local Robot Interface
          </button>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
backgroundColor: 'rgba(0, 188, 212, 0.2)',
border: '2px solid #00bcd4',  // Teal/cyan colored border
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              ':hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {robots.length === 0 ? (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>{!connected ? 'Connecting to robots...' : 'Loading robots...'}</p>
        </div>
      ) : (
        robots.map(robot => {
          const Renderer = cardModules[robot.ui_type || 'default'];
          return Renderer ? (
            <div
              key={robot.robot_id}
              style={{
                scrollSnapAlign: 'start',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxSizing: 'border-box',
              }}
            >
              <Renderer robot={robot} />
            </div>
          ) : null;
        })
      )}
    </div>
  );
}

export default Dashboard;
