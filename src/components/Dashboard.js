import React from "react";
import { useParams } from "react-router-dom";
import VideoStream from "./VideoStream";
import ControlPanel from "./ControlPanel";


function Dashboard() {
  const { robotId } = useParams(); // Extracts the robot ID from the URL

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard – Robot ID: {robotId}</h2>

      {/* Live camera feed */}
      <VideoStream robotId={robotId} />

      {/* Robot control buttons */}
      <ControlPanel robotId={robotId} />
    </div>
  );
}

export default Dashboard;
