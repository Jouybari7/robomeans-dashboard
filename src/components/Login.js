import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [robotId, setRobotId] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (robotId.trim()) {
      navigate(`/dashboard/${robotId}`);
    } else {
      alert("Please enter your robot's ID.");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Log In with Robot ID</h2>
      <input
        type="text"
        placeholder="Enter Robot ID"
        value={robotId}
        onChange={(e) => setRobotId(e.target.value)}
      />
      <button onClick={handleLogin} style={{ marginLeft: 10 }}>Go</button>
    </div>
  );
}

export default Login;
