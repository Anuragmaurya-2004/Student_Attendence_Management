const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
      throw new Error('MONGO_URI must be configured for the deployed backend.');
    }
    connectionPromise = mongoose.connect(uri || 'mongodb://localhost:27017/attendance_system', {
      serverSelectionTimeoutMS: 10000,
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
  return mongoose.connection;
};

module.exports = connectDB;
