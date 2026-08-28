const jwt = require('jsonwebtoken');
const { setLive } = require('./liveLocations');

let _io;
const _persistAt = new Map(); // userId -> { lat, lng, at }

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Persist the live fix into Provider.geoLocation so it survives restarts —
// throttled (max ~1 write / min, or immediately if the worker moved > 200 m).
async function persistLocation(userId, lat, lng) {
  try {
    const last = _persistAt.get(userId);
    const now = Date.now();
    const moved = last ? haversineKm(last, { lat, lng }) : 1;
    if (!last || now - last.at > 60000 || moved > 0.2) {
      _persistAt.set(userId, { lat, lng, at: now });
      const Provider = require('../models/Provider');
      await Provider.updateOne({ userId }, { geoLocation: { lat, lng } });
    }
  } catch (e) {
    // persistence is best-effort — live cache still works
  }
}

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

    // Real-time geolocation stream: worker -> server -> household (§3.3).
    // Also cached so the household radar shows the worker's live fix (not stale DB).
    socket.on('provider:location_update', async (data) => {
      try {
        const { bookingId, lat, lng } = data || {};
        if (lat == null || lng == null) return;
        setLive(socket.userId, data);
        if (bookingId) {
          const Booking = require('../models/Booking');
          const b = await Booking.findById(bookingId);
          if (b && b.householdId) {
            emitTo(b.householdId.toString(), 'provider:location_update', {
              bookingId, lat: Number(lat), lng: Number(lng), at: Date.now(),
            });
            await persistLocation(socket.userId, Number(lat), Number(lng));
          }
        }
      } catch (e) {
        // ignore malformed location pushes
      }
    });

    // Presence heartbeat: worker streaming GPS while browsing the job feed.
    // Feeds the household radar in real time + persists a throttled last-fix.
    socket.on('provider:heartbeat', async (data) => {
      try {
        const { lat, lng, accuracy } = data || {};
        if (lat == null || lng == null) return;
        setLive(socket.userId, data);
        await persistLocation(socket.userId, Number(lat), Number(lng));
      } catch (e) {
        // ignore
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
