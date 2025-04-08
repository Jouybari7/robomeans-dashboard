import React, { useEffect, useState } from 'react';
import './App.css';
import { Amplify, Auth } from 'aws-amplify';
import awsConfig from './aws-exports';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { Auth } from 'aws-amplify';

Amplify.configure(awsConfig);


const fetchAuthToken = async () => {
  const session = await Auth.currentSession();
  const token = session.getIdToken().getJwtToken();
  return { token };
};

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
        setRobotIds(data.robot_ids || []);
      } catch (error) {
        console.error("Failed to fetch robot IDs:", error);
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
