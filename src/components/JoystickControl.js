// src/components/JoystickControl.js
import React, { useRef } from 'react';
import { Joystick } from 'react-joystick-component';

export default function JoystickControl({ robot_id, sendCommand, disabled }) {
  const joystickIntervalRef = useRef(null);
  const latestTwistRef = useRef({ linear: 0, angular: 0 });

  const handleMove = (e) => {
    if (disabled) return;

    const maxSpeed = 0.5;
    const linear = -(e.y * -maxSpeed).toFixed(2);
    const angular = -(e.x * maxSpeed).toFixed(2);
    latestTwistRef.current = { linear, angular };

    if (!joystickIntervalRef.current) {
      joystickIntervalRef.current = setInterval(() => {
        const { linear, angular } = latestTwistRef.current;
        sendCommand(robot_id, `twist:${linear},${angular}`);
      }, 100);
    }
  };

  const handleStop = () => {
    latestTwistRef.current = { linear: 0, angular: 0 };
    sendCommand(robot_id, 'twist:0,0');
    if (joystickIntervalRef.current) {
      clearInterval(joystickIntervalRef.current);
      joystickIntervalRef.current = null;
    }
  };

return (
  <div
    style={{
      display: 'flex',
      justifyContent: 'flex-start', // Align to the left
      marginTop: '10px',
      pointerEvents: disabled ? 'none' : 'auto',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <div
      style={{
        width: '100px',
        height: '100px',
        aspectRatio: '1 / 1',
        // background: 'radial-gradient(circle, #777 0%, #e0e0e0 100%)',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // boxShadow:
        //   'inset 2px 2px 6px rgba(255,255,255,0.1), inset -2px -2px 6px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.0)',
        // border: '2px solid #999',
        overflow: 'hidden',
        flexShrink: 0,
        marginLeft: '-3px' // Optional spacing from left edge
      }}
    >
      <Joystick
        size={100}
        baseColor="#e0e0e0"
        stickColor="#1E90FF"
        move={handleMove}
        stop={handleStop}
        stickShape="circle"
      />
    </div>
  </div>
);

}
