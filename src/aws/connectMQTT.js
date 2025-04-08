import mqtt from 'mqtt';
import { Auth } from 'aws-amplify';

const region = 'us-east-2';
const iotEndpoint = 'wss://a2mlvkstmb4ozp-ats.iot.us-east-2.amazonaws.com/mqtt';

export const connectMQTT = async () => {
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
      console.log('✅ MQTT connected');
    });

    client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error);
    });

    return client;
  } catch (error) {
    console.error('❌ Failed to get AWS credentials:', error);
  }
};
