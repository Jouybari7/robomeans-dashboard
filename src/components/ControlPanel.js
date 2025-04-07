import React from "react";
import axios from "axios";
import robotIpMap from "../robotLookup";

function ControlPanel({ robotId }) {
  const sendCommand = async (action) => {
    const robotIp = robotIpMap[robotId];

    if (!robotIp) {
      alert("Robot IP not found for this ID.");
      return;
    }

    const url = `https://robomeans-gateway.onrender.com/api/${robotId}/${action}`;
    console.log(`Sending POST to ${url}`);

    try {
      console.log("Sending to:", url);
      const response = await axios.post(url);
      console.log("Response:", response.data);
      alert(`${action} command sent to ${robotId}`);
    } catch (err) {
      console.error(err);
      alert(`Error sending ${action} to ${robotId}: ${err.message}`);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h4>Robot Controls</h4>
      <button onClick={() => sendCommand("start")}>Start</button>
      <button onClick={() => sendCommand("navigate")}>Navigate</button>
      <button onClick={() => sendCommand("dock")}>Dock</button>
      <button onClick={() => sendCommand("undock")}>Undock</button>
    </div>
  );
}

export default ControlPanel; // ✅ Add this line
