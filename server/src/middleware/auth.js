module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    const token = header.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'sahakargig_dev_secret');
    req.user = payload; // { userId, role }
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Soft variant — attaches req.user when a valid token exists, otherwise continues.
// Used by /auth/send-otp so public flows (signup/reset) and logged-in flows
// (change_password/verify_email/change_email) share one endpoint.
module.exports.optionalAuth = function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header) {
      const token = header.split(' ')[1];
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'sahakargig_dev_secret');
    }
  } catch (_) { /* stay anonymous */ }
  next();
};
