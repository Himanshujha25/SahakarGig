import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    // Send JWT token so server can verify identity on connect
    cb({ token: localStorage.getItem('sg_token') || '' });
  },
});

export default socket;
