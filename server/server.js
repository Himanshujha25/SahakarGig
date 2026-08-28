require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'sahakargig_dev_secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sahakargig';

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { initSocket } = require('./src/socket');
const connectDB = require('./src/config/db');
const dns = require("dns");
const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

dns.setServers(["8.8.8.8", "1.1.1.1"]);
// Serve uploaded provider documents as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
initSocket(io);

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/providers', require('./src/routes/providers'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/federation', require('./src/routes/federation'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/welfare', require('./src/routes/welfare'));
app.use('/api/notifications', require('./src/routes/notifications'));

app.get('/api/stats', async (_req, res) => {
  try {
    const Provider = require('./src/models/Provider');
    const Booking = require('./src/models/Booking');
    const Cooperative = require('./src/models/Cooperative');
    const Review = require('./src/models/Review');
    const [providers, bookings, cooperatives, ratingAgg] = await Promise.all([
      Provider.countDocuments({ verified: true }),
      Booking.countDocuments({ status: 'completed' }),
      Cooperative.countDocuments(),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);
    res.json({
      providers,
      bookings,
      cooperatives,
      avgRating: ratingAgg[0]?.avg ? Number(ratingAgg[0].avg.toFixed(1)) : 0,
    });
  } catch { res.status(500).json({ message: 'stats unavailable' }); }
});

const healthHandler = (_req, res) => res.json({
  ok: true,
  status: 'healthy',
  service: 'SahakarGig API',
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.floor(process.uptime()),
});

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Keep-Alive Ping for Render Free Tier (Pings /health every 7 minutes to prevent sleeping)
const PING_INTERVAL_MS = 7 * 60 * 1000; // 7 minutes
setInterval(() => {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://sahakargig.onrender.com';
  try {
    const httpModule = targetUrl.startsWith('https') ? require('https') : require('http');
    httpModule.get(`${targetUrl}/health`, (res) => {
      console.log(`[Keep-Alive Ping] (${new Date().toLocaleTimeString()}) ${targetUrl}/health -> ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`[Keep-Alive Ping Warning] ${err.message}`);
    });
  } catch (err) {
    console.warn(`[Keep-Alive Ping Error] ${err.message}`);
  }
}, PING_INTERVAL_MS);

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGODB_URI)
  .then(() => server.listen(PORT, () => console.log(`[server] SahakarGig API running on ${PORT}`)))
  .catch((err) => console.error('[server] DB connection failed:', err.message));
