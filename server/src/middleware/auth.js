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
