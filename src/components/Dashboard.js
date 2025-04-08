import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import mqtt from 'mqtt';

const region = 'us-east-2'; // Your region
const iotEndpoint = 'wss://a2mlvkstmb4ozp-ats.iot.us-east-2.amazonaws.com/mqtt';

const Dashboard = () => {
  const { robotId } = useParams();
  const [status, setStatus] = useState('Disconnected');
  const [client, setClient] = useState(null);

  useEffect(() => {
    const connectToMQTT = async () => {
      try {
        const credentials = await Auth.currentCredentials();
        const { accessKeyId, secretAccessKey, sessionToken } = credentials;

        const mqttClient = mqtt.connect(iotEndpoint, {
          protocol: 'wss',
          accessKeyId,
          secretKey: secretAccessKey,
          sessionToken,
          region,
          reconnectPeriod: 1000,
        });

        mqttClient.on('connect', () => {
          console.log('✅ Connected to AWS IoT');
          setStatus('Connected');
          mqttClient.subscribe(`robot/${robotId}/status`);
        });

        mqttClient.on('message', (topic, message) => {
          console.log(`📩 Message on ${topic}: ${message.toString()}`);
          setStatus(message.toString());
        });

        mqttClient.on('error', (err) => {
          console.error('MQTT error:', err);
          setStatus('Connection error');
        });

        setClient(mqttClient);
      } catch (err) {
        console.error('MQTT connection error:', err);
        setStatus('Authentication failed');
      }
    };

    connectToMQTT();
  }, [robotId]);

  const sendCommand = (command) => {
    if (!client || !client.connected) {
      alert('MQTT not connected');
      return;
    }

    const topic = `robot/${robotId}/command`;
    client.publish(topic, command);
    console.log(`🚀 Sent command: ${command} to ${topic}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Robot Dashboard: {robotId}</h2>
      <p>Status: {status}</p>

      <button onClick={() => sendCommand('start')}>Start</button>
      <button onClick={() => sendCommand('navigate')}>Navigate</button>
      <button onClick={() => sendCommand('dock')}>Dock</button>
      <button onClick={() => sendCommand('undock')}>Undock</button>
    </div>
  );
};

export default Dashboard;
