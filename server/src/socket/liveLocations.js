// In-memory live geolocation cache — workers stream GPS while online
// (provider:heartbeat / provider:location_update). Radar + feed merge these
// with the saved geoLocation so distances stay real-time accurate.
const FRESH_MS = 90 * 1000; // a fix older than this is treated as stale → fall back to saved geo

const _cache = new Map(); // userId -> { lat, lng, accuracy, at }

function setLive(userId, { lat, lng, accuracy }) {
  if (userId == null || lat == null || lng == null) return;
  _cache.set(String(userId), {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number(accuracy) || 0,
    at: Date.now(),
  });
}

function getFresh(userId) {
  const v = _cache.get(String(userId));
  if (v && Date.now() - v.at <= FRESH_MS) return v;
  return null;
}

module.exports = { setLive, getFresh, FRESH_MS };