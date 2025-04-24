import React, { useEffect, useState, Suspense } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';
import Slider from './components/Slider';

function Dashboard() {
  const [robots, setRobots] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [connected, setConnected] = useState(false);
  const [robotStates, setRobotStates] = useState({});
  const [missions, setMissions] = useState({});
  const [cardModules, setCardModules] = useState({}); // { ui_type: module }

  useEffect(() => {console.log("📦 robotStates updated:", robotStates);}, [robotStates]); {/* for debugging purposes */}
  

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

        // preload renderers
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
          const { robot_id } = data;
          if (!robot_id) return;
        
          // Update raw status (optional)
          setStatuses(prev => ({ ...prev, [robot_id]: data.mode })); // or any other field
        
          // Update robot state
          setRobotStates(prev => {
            const previous = prev[robot_id] || {};
        
            return {
              ...prev,
              [robot_id]: {
                ...previous,
                ...data,              // Overwrite fields like pose, mode, etc.
                loading: false,
                lastCommand: data.mode || previous.lastCommand,  // Save mode as lastCommand (or pick another field if needed)
              },
            };
          });
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

  const sendCommand = (robotId, command) => {
    socket.emit('command_to_robot', {
      robot_id: robotId,
      command,
    });

    setRobotStates(prev => ({
      ...prev,
      [robotId]: {
        ...prev[robotId],
        loading: true,
        commandInProgress: command,
      },
    }));
  };

  const handleMissionChange = (robotId, index) => {
    setMissions(prev => {
      const current = prev[robotId] || Array(10).fill(false);
      const updated = [...current];
      updated[index] = !updated[index];
      return { ...prev, [robotId]: updated };
    });
  };

  const handleSignOut = async () => {
    await Auth.signOut();
    window.location.reload();
  };

  const sharedProps = {
    statuses,
    robotStates,
    missions,
    sendCommand,
    handleMissionChange,
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Your Robots</h2>
      {!connected && <p>Connecting to robots...</p>}
      {robots.length === 0 ? (
        <p>Loading robots...</p>
      ) : (
        robots.map(robot => {
          const renderer = cardModules[robot.ui_type || 'default'];
          return renderer ? renderer(robot, sharedProps) : null;
        })
      )}
      <br />
      
      <pre style={{ textAlign: 'left', background: '#eee', padding: '10px', marginTop: '20px' }}> {JSON.stringify(robotStates, null, 2)}</pre>  {/* for debugging purposes */}

      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Dashboard;
