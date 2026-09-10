const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    }
    return 'sahakargig_dev_secret';
  }
  return secret;
}

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, getJwtSecret());
    req.user = payload; // { userId, role }
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized or invalid token' });
  }
};

module.exports.optionalAuth = function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header) {
      const token = header.split(' ')[1];
      req.user = jwt.verify(token, getJwtSecret());
    }
  } catch (_) { /* stay anonymous */ }
  next();
};
