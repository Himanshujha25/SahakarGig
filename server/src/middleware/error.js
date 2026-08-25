const jwt = require('jsonwebtoken');

// Simple wrapper to standardize error responses
module.exports = function asyncHandler(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    });
  };
};
