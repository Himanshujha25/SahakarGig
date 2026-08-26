import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: false,
  auth: (cb) => {
    // Send JWT token so server can verify identity on connect
    cb({ token: localStorage.getItem('sg_token') || '' });
  },
});

export default socket;
