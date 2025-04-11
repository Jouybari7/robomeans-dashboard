// src/socket.js
import { io } from 'socket.io-client';

// Replace with your actual EC2 public IP
const SOCKET_SERVER_URL = "http://15.223.6.249:8000";

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: false,
});
