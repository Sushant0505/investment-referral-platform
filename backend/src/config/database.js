/**
 * Database Configuration
 * Handles MongoDB connection and initialization
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 * Implements connection pooling and error handling
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/investment-platform';

    const connection = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    });

    logger.info(`MongoDB connected: ${connection.connection.host}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    return connection;
  } catch (error) {
    logger.error(`Failed to connect MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error(`Failed to disconnect MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all collections (useful for testing)
 */
const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    logger.info('Database cleared successfully');
  } catch (error) {
    logger.error(`Failed to clear database: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
};
