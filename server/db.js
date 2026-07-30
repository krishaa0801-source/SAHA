const mongoose = require('mongoose');
const logger = require('./utils/logger');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file (see .env.example).');
  }
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
}

module.exports = connectDB;
