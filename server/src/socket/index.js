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

    // Real-time geolocation stream: worker -> server -> household (§3.3)
    socket.on('provider:location_update', async (data) => {
      try {
        const { bookingId, lat, lng } = data || {};
        if (!bookingId || lat == null || lng == null) return;
        const Booking = require('../models/Booking');
        const b = await Booking.findById(bookingId);
        if (b && b.householdId) {
          emitTo(b.householdId.toString(), 'provider:location_update', {
            bookingId, lat: Number(lat), lng: Number(lng), at: Date.now(),
          });
        }
      } catch (e) {
        // ignore malformed location pushes
      }
    });
  });
}

function emitTo(userId, event, data) {
  if (_io) _io.to('user:' + userId).emit(event, data);
}

// Broadcast to ALL connected clients (used to notify every worker a job is claimed)
function broadcastAll(event, data) {
  if (_io) _io.emit(event, data);
}

module.exports = { initSocket, emitTo, broadcastAll };
