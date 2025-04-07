import React from 'react';
import './App.css';
import Amplify from 'aws-amplify';
import awsConfig from './aws-exports';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';

// ✅ Initialize Amplify with Cognito, IoT, etc.
Amplify.configure(awsConfig);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard/:robotId" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

// ✅ Protect with login
export default withAuthenticator(App);
