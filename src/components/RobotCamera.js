import React, { useEffect, useState } from 'react';
import { socket } from '../socket';

const RobotCamera = ({ robotId }) => {
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        const eventName = `robot_image_${robotId}`;

        const handleImage = (data) => {
            if (data.image_base64) {
                const imageData = `data:image/jpeg;base64,${data.image_base64}`;
                setImageSrc(imageData);
            } else {
                console.warn('Received robot_image event but missing image_base64');
            }
        };

        socket.on(eventName, handleImage);
        console.log(`📡 Subscribed to ${eventName}`);

        return () => {
            socket.off(eventName, handleImage);
        };
    }, [robotId]);

return (
    <div style={{top: '5px', left: '5px',width: '320px', height: '240px', border: '2px solid #222', borderRadius: '10px', overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}>
        <h3 style={{ position: 'absolute', top: '5px', left: '60px', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '5px', margin: 0 }}>
            Live Stream - {robotId}
        </h3>
        {imageSrc ? (
            <img 
                src={imageSrc} 
                alt="Robot Camera" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
        ) : (
            <p style={{ textAlign: 'center', marginTop: '50%', color: '#ccc' }}>Waiting for video...</p>
        )}
    </div>
);
};

export default RobotCamera;
