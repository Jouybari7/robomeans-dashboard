// mqttClient.js
import mqtt from 'mqtt';
import { Auth } from 'aws-amplify';
import { createPresignedUrl } from './SigV4Utils';

const region = 'us-east-2';
const iotEndpoint = 'a2mlvkstmb4ozp-ats.iot.us-east-2.amazonaws.com';

export async function connectToMQTT(robotId) {
  try {
    const credentials = await Auth.currentCredentials();
    const url = createPresignedUrl(iotEndpoint, region, credentials);

    const client = mqtt.connect(url, {
      reconnectPeriod: 1000,
      clientId: `robomeans-${robotId}-${Math.floor(Math.random() * 10000)}`,
      protocol: 'wss'
    });

    return client;
  } catch (error) {
    console.error('❌ MQTT connection failed:', error);
    return null;
  }
}
