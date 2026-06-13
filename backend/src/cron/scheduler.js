/**
 * Cron Job Service
 * Scheduled tasks using node-cron
 * Runs daily ROI processing at 12:00 AM (configurable)
 */

const cron = require('node-cron');
const ROIService = require('../services/roiService');
const logger = require('../utils/logger');

// Store active cron jobs
const activeJobs = {};

/**
 * Daily ROI Processing Cron Job
 * Runs every day at 12:00 AM (00:00)
 * Time zone: UTC (configurable via environment variable)
 *
 * Cron expression format: second minute hour day month dayOfWeek
 * '0 0 * * *' = At 00:00 every day
 */
const startDailyROICron = () => {
  try {
    const cronTime = process.env.ROI_CRON_TIME || '0 0 * * *'; // Default: 12:00 AM daily
    const timezone = process.env.CRON_TIMEZONE || 'UTC';

    logger.info(`Starting daily ROI cron job with schedule: ${cronTime} (${timezone})`);

    const job = cron.schedule(
      cronTime,
      async () => {
        logger.info('Starting scheduled daily ROI processing');

        try {
          const result = await ROIService.processDailyROI();

          logger.info(`Daily ROI processing completed successfully`, {
            processedCount: result.processedCount,
            failedCount: result.failedCount,
            date: result.date,
          });
        } catch (error) {
          logger.error(`Daily ROI processing failed: ${error.message}`);
          // Send alert/notification about cron job failure
          // await notificationService.alertAdmins(error);
        }
      },
      {
        scheduled: true,
        timezone,
      }
    );

    // Store job reference for management
    activeJobs.dailyROI = job;

    logger.info('Daily ROI cron job started successfully');

    return job;
  } catch (error) {
    logger.error(`Failed to start daily ROI cron: ${error.message}`);
    throw error;
  }
};

/**
 * Stop daily ROI cron job
 */
const stopDailyROICron = () => {
  try {
    if (activeJobs.dailyROI) {
      activeJobs.dailyROI.stop();
      delete activeJobs.dailyROI;
      logger.info('Daily ROI cron job stopped');
    }
  } catch (error) {
    logger.error(`Failed to stop daily ROI cron: ${error.message}`);
    throw error;
  }
};

/**
 * Manual ROI processing trigger (for testing or on-demand)
 * Can be called via API endpoint
 */
const triggerManualROIProcessing = async () => {
  try {
    logger.info('Manual ROI processing triggered');
    const result = await ROIService.processDailyROI();

    return {
      success: true,
      message: 'ROI processing completed',
      result,
    };
  } catch (error) {
    logger.error(`Manual ROI processing failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get cron job status
 */
const getCronJobStatus = () => {
  return {
    dailyROI: {
      active: !!activeJobs.dailyROI,
      schedule: process.env.ROI_CRON_TIME || '0 0 * * *',
      timezone: process.env.CRON_TIMEZONE || 'UTC',
    },
  };
};

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  try {
    logger.info('Initializing cron jobs');

    // Only start cron jobs in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
      startDailyROICron();
    } else {
      logger.warn('Cron jobs disabled in development mode. Enable with ENABLE_CRON=true');
    }

    logger.info('Cron jobs initialization completed');
  } catch (error) {
    logger.error(`Cron jobs initialization failed: ${error.message}`);
    throw error;
  }
};

/**
 * Gracefully shutdown cron jobs
 */
const shutdownCronJobs = () => {
  try {
    logger.info('Shutting down cron jobs');

    Object.keys(activeJobs).forEach((jobName) => {
      activeJobs[jobName].stop();
      logger.info(`Stopped cron job: ${jobName}`);
    });

    logger.info('All cron jobs stopped successfully');
  } catch (error) {
    logger.error(`Error during cron jobs shutdown: ${error.message}`);
  }
};

module.exports = {
  startDailyROICron,
  stopDailyROICron,
  triggerManualROIProcessing,
  getCronJobStatus,
  initializeCronJobs,
  shutdownCronJobs,
};
