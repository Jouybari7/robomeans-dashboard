import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import mqtt from 'mqtt';
import { getSignedUrl } from '../SigV4Utils'; // Must be in src/

const region = 'us-east-2';
const iotEndpoint = 'a2mlvkstmb4ozp-ats.iot.us-east-2.amazonaws.com';

const Dashboard = () => {
  const { robotId } = useParams();
  const [status, setStatus] = useState('Disconnected');
  const [client, setClient] = useState(null);

  useEffect(() => {
    const connectToMQTT = async () => {
      try {
        const credentials = await Auth.currentCredentials();
        const signedUrl = getSignedUrl({
          host: iotEndpoint,
          region,
          credentials,
        });

        const mqttClient = mqtt.connect(signedUrl, {
          protocol: 'wss',
          reconnectPeriod: 1000,
        });

        mqttClient.on('connect', () => {
          console.log('✅ Connected to AWS IoT');
          setStatus('Connected');
          mqttClient.subscribe(`robot/${robotId}/status`);
        });

        mqttClient.on('message', (topic, message) => {
          console.log(`📩 ${topic}: ${message.toString()}`);
          setStatus(message.toString());
        });

        mqttClient.on('error', (err) => {
          console.error('❌ MQTT error:', err);
          setStatus('Connection error');
        });

        setClient(mqttClient);
      } catch (err) {
        console.error('❌ Failed to connect:', err);
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
