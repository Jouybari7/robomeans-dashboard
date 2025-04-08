import React from 'react';
import { connectMQTT } from '../aws/connectMQTT';

function ControlPanel({ robotId }) {
  const sendMQTTCommand = async (action) => {
    const client = await connectMQTT();
    const topic = `robot/${robotId}/cmd`;
    const payload = JSON.stringify({ action });

    client.publish(topic, payload);
    alert(`MQTT "${action}" sent to ${robotId}`);
  };

  return (
    <div>
      <button onClick={() => sendMQTTCommand("start")}>Start</button>
      <button onClick={() => sendMQTTCommand("navigate")}>Navigate</button>
      <button onClick={() => sendMQTTCommand("dock")}>Dock</button>
      <button onClick={() => sendMQTTCommand("undock")}>Undock</button>
    </div>
  );
}

export default ControlPanel;
