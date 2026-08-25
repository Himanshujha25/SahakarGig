let _io;

function initSocket(io) {
  _io = io;
  io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join('user:' + userId));
  });
}

function emitTo(userId, event, data) {
  if (_io) _io.to('user:' + userId).emit(event, data);
}

module.exports = { initSocket, emitTo };
