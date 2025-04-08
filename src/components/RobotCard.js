import React from 'react';
import { useNavigate } from 'react-router-dom';

const RobotCard = ({ robotId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/dashboard/${robotId}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '10px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        background: '#f9f9f9'
      }}
    >
      <h3>🤖 Robot ID: {robotId}</h3>
      <p>Click to open dashboard</p>
    </div>
  );
};

export default RobotCard;
