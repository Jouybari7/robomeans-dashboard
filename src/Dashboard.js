import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Auth } from 'aws-amplify';

function Dashboard() {
  const [robots, setRobots] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [connected, setConnected] = useState(false);
  const [robotStates, setRobotStates] = useState({});
  const [missions, setMissions] = useState({});
  const [cardModules, setCardModules] = useState({});
  const [pickingPoseRobotId, setPickingPoseRobotId] = useState(null);

  async function fetchMissionsFromDB(robot_id) {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    const res = await fetch(`https://api.robomeans.com/api/get_missions/${robot_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    return data.missions || [];
  }

  async function saveMissionsToDB(robot_id, missions) {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    const userInfo = await Auth.currentUserInfo();
    const email = userInfo?.attributes?.email;

    await fetch("https://api.robomeans.com/api/save_missions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, robot_id, missions }),
    });
  }

  useEffect(() => {
    console.log("📦 robotStates updated:", robotStates);
  }, [robotStates]);

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

        const loadedMissions = {};
        for (const robot of data.robots) {
          loadedMissions[robot.robot_id] = await fetchMissionsFromDB(robot.robot_id);
        }
        setMissions(loadedMissions);

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

          setStatuses(prev => ({ ...prev, [robot_id]: data.mode }));

          setRobotStates(prev => {
            const previous = prev[robot_id] || {};
            return {
              ...prev,
              [robot_id]: {
                ...previous,
                ...data,
                loading: false,
                lastCommand: data.mode || previous.lastCommand,
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

  // ✅ Skip state updates for high-frequency joystick commands
  if (typeof command === 'string' && (command.startsWith('twist:') || command === 'stop')) {
    return;
  }

  // ✅ Only update UI state for major commands
  setRobotStates(prev => ({
    ...prev,
    [robotId]: {
      ...prev[robotId],
      loading: true,
      commandInProgress: typeof command === 'string' ? command : command.command,
    },
  }));
};


  const handleMissionChange = async (robotId, updatedMissions) => {
    setMissions(prev => ({
      ...prev,
      [robotId]: updatedMissions
    }));

    await saveMissionsToDB(robotId, updatedMissions);
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
    pickingPoseRobotId,
    setPickingPoseRobotId,
    connected,
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Your Robots</h2>
      {!connected && <p>Connecting to robots...</p>}
      {robots.length === 0 ? (
        <p>Loading robots...</p>
      ) : (
        robots.map(robot => {
          const Renderer = cardModules[robot.ui_type || 'default'];
          return Renderer ? (
            <Renderer key={robot.robot_id} robot={robot} sharedProps={sharedProps} />
          ) : null;
        })
      )}
      <br />

      <pre style={{ textAlign: 'left', background: '#eee', padding: '10px', marginTop: '20px' }}>
        {JSON.stringify(robotStates, null, 2)}
      </pre>

      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Dashboard;
