import React from "react";
import { connectMQTT } from "../mqttClient";

function ControlPanel({ robotId }) {
  const sendMqttCommand = async (action) => {
    try {
      const client = await connectMQTT();

      client.on("connect", () => {
        console.log("✅ MQTT connected");

        const topic = `${robotId}/${action}`;
        const payload = JSON.stringify({ command: action });

        client.publish(topic, payload, {}, (err) => {
          if (err) {
            console.error("❌ MQTT publish failed:", err);
            alert(`MQTT error: ${err.message}`);
          } else {
            console.log(`✅ MQTT published to ${topic}`);
            alert(`${action} command sent via MQTT to ${robotId}`);
          }
        });
      });

      client.on("error", (err) => {
        console.error("❌ MQTT connection error:", err);
        alert(`MQTT connection error: ${err.message}`);
      });
    } catch (err) {
      console.error("❌ MQTT setup failed:", err);
      alert(`MQTT setup error: ${err.message}`);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h4>Robot Controls</h4>
      <button onClick={() => sendMqttCommand("start")}>Start</button>
      <button onClick={() => sendMqttCommand("navigate")}>Navigate</button>
      <button onClick={() => sendMqttCommand("dock")}>Dock</button>
      <button onClick={() => sendMqttCommand("undock")}>Undock</button>
    </div>
  );
}

export default ControlPanel;
