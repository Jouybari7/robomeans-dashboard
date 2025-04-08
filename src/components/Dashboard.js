import React, { useEffect } from 'react';
import mqtt from 'mqtt';
import { Auth } from 'aws-amplify';
import { useParams } from 'react-router-dom';

const region = 'us-east-2';
const iotEndpoint = 'wss://a2mlvkstmb4ozp-ats.iot.us-east-2.amazonaws.com/mqtt';

const Dashboard = () => {
  const { robotId } = useParams();

  useEffect(() => {
    const connectMQTT = async () => {
      try {
        const credentials = await Auth.currentCredentials();
        const { accessKeyId, secretAccessKey, sessionToken } = credentials;

        const client = mqtt.connect(iotEndpoint, {
          protocol: 'wss',
          accessKeyId,
          secretKey: secretAccessKey,
          sessionToken,
          region,
          reconnectPeriod: 1000,
        });

        client.on('connect', () => {
          console.log('✅ MQTT Connected');
          client.subscribe(`robot/${robotId}/status`);
        });

        client.on('message', (topic, message) => {
          console.log(`📩 Message on ${topic}: ${message.toString()}`);
        });
      } catch (err) {
        console.error('MQTT connection error:', err);
      }
    };

    connectMQTT();
  }, [robotId]);

  return (
    <div>
      <h2>Dashboard – Robot ID: {robotId}</h2>
      {/* Add more components like video feed or control panel here */}
    </div>
  );
};

export default Dashboard;
