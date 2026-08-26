const jwt = require('jsonwebtoken');

let _io;

function initSocket(io) {
  _io = io;

  // Verify JWT on every socket connection — no unauthenticated sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'sahakargig_dev_secret');
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join the user's own room — client cannot spoof another userId
    socket.join('user:' + socket.userId);
  });
}

function emitTo(userId, event, data) {
  if (_io) _io.to('user:' + userId).emit(event, data);
}

module.exports = { initSocket, emitTo };
