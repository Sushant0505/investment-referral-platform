/**
 * Main Application File
 * Express server setup with middleware and routes
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const cronScheduler = require('./cron/scheduler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const referralRoutes = require('./routes/referralRoutes');

// Initialize Express app
const app = express();

/**
 * MIDDLEWARE SETUP
 */

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Logging
app.use(morgan(process.env.MORGAN_FORMAT || 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

/**
 * ROUTES
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Investment & Referral Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      investments: '/api/investments',
      dashboard: '/api/dashboard',
      referrals: '/api/referrals',
    },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/referrals', referralRoutes);

/**
 * ERROR HANDLING MIDDLEWARE
 */

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

/**
 * SERVER INITIALIZATION
 */

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Initialize cron jobs
    cronScheduler.initializeCronJobs();

    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API URL: http://localhost:${PORT}/api`);
    });

    /**
     * GRACEFUL SHUTDOWN
     */
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      cronScheduler.shutdownCronJobs();
      server.close(() => {
        logger.info('HTTP server closed');
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      cronScheduler.shutdownCronJobs();
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message}`);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at ${promise}: ${reason}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;
