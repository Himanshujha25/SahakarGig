import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('sg_token') || '' }),
});

// Reconnect with a fresh token (call after login / token change)
export function reconnectSocket() {
  if (socket.connected) socket.disconnect();
  socket.auth = (cb) => cb({ token: localStorage.getItem('sg_token') || '' });
  socket.connect();
}

export default socket;
