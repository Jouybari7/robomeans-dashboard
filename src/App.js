import React, { useEffect, useState } from 'react';
import './App.css';
import { Amplify, Auth } from 'aws-amplify';
import awsConfig from './aws-exports';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';

Amplify.configure(awsConfig);
window.Auth = Auth; // ✅ make Auth available in browser console

async function fetchAuthToken() {
  const session = await Auth.currentSession();
  return {
    token: session.getIdToken().getJwtToken(),
  };
}

function RedirectToDashboard() {
  const [robotIds, setRobotIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRobotIds = async () => {
      try {
        const { token } = await fetchAuthToken();
        const response = await fetch('http://18.220.132.145:8000/api/myrobots', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("👉 Raw data from API:", data); // <-- Add this line


        // ✅ Adapt to DynamoDB format where each item is { S: "robot001" }
        const ids = data.robot_ids.map(item => item.S);
        console.log("✅ Parsed robot IDs:", ids); // <-- And this line
 
        setRobotIds(ids);
      } catch (error) {
        console.error("❌ Failed to fetch robot IDs:", error);
      }
    };

    fetchRobotIds();
  }, []);

  useEffect(() => {
    if (robotIds.length > 0) {
      navigate(`/dashboard/${robotIds[0]}`);
    }
  }, [robotIds, navigate]);

  return <div>Loading robots...</div>;
}

export default withAuthenticator(() => (
  <Router>
    <Routes>
      <Route path="/" element={<RedirectToDashboard />} />
      <Route path="/dashboard/:robotId" element={<Dashboard />} />
    </Routes>
  </Router>
));
