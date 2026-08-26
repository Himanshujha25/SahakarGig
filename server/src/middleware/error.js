// asyncHandler — wraps async route handlers, passes next so Express error chain works
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    });
  };
};
