import React, { useEffect } from 'react';
import { connectMQTT } from '../aws/connectMQTT';

function Dashboard() {
  useEffect(() => {
    connectMQTT().then((client) => {
      if (client) {
        client.subscribe('robot/robot001/status');
        client.on('message', (topic, message) => {
          console.log(`📩 Message from ${topic}:`, message.toString());
        });
      }
    });
  }, []);

  return (
    <div>
      <h1>Robot Dashboard</h1>
      {/* More dashboard UI */}
    </div>
  );
}

export default Dashboard;
