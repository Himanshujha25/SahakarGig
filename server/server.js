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

const app = express();

const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

// Serve uploaded provider documents as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN, credentials: true } });
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

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGODB_URI)
  .then(() => server.listen(PORT, () => console.log(`[server] SahakarGig API running on ${PORT}`)))
  .catch((err) => console.error('[server] DB connection failed:', err.message));
