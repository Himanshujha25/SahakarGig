require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'sahakargig_dev_secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sahakargig';
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { initSocket } = require('./src/socket');
const connectDB = require('./src/config/db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
initSocket(io);

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/providers', require('./src/routes/providers'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/welfare', require('./src/routes/welfare'));
app.use('/api/notifications', require('./src/routes/notifications'));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGODB_URI)
  .then(() => server.listen(PORT, () => console.log(`[server] SahakarGig API running on ${PORT}`)))
  .catch((err) => console.error('[server] DB connection failed:', err.message));
