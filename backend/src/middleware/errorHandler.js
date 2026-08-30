// Centralized error handler
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Handle Mongo duplicate key error nicely
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate value error',
      keyValue: err.keyValue,
    });
  }

  // Multer file-upload errors (wrong file type, too large, etc.) - bad
  // request, not a server error
  if (err.name === 'MulterError' || /only \.xlsx|only \.csv/i.test(err.message || '')) {
    return res.status(400).json({ message: err.message });
  }

  res.status(statusCode).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
