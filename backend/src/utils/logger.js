/**
 * Logger Utility
 * Provides consistent logging across the application
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m',
};

/**
 * Format log message with timestamp
 */
const formatLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    logMessage += ` ${JSON.stringify(data)}`;
  }
  return logMessage;
};

/**
 * Write log to file
 */
const writeToFile = (level, message, data = null) => {
  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
  const logMessage = formatLog(level, message, data) + '\n';
  
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

/**
 * Console log with colors
 */
const consoleLog = (level, message, data = null) => {
  const color = colors[level] || '';
  const resetColor = colors.RESET;
  const logMessage = formatLog(level, message, data);
  
  console.log(`${color}${logMessage}${resetColor}`);
};

/**
 * Logger object with methods for each level
 */
const logger = {
  error: (message, data = null) => {
    const level = logLevels.ERROR;
    consoleLog(level, message, data);
    writeToFile(level, message, data);
  },

  warn: (message, data = null) => {
    const level = logLevels.WARN;
    consoleLog(level, message, data);
    writeToFile(level, message, data);
  },

  info: (message, data = null) => {
    const level = logLevels.INFO;
    if (process.env.NODE_ENV !== 'test') {
      consoleLog(level, message, data);
    }
    writeToFile(level, message, data);
  },

  debug: (message, data = null) => {
    if (process.env.LOG_LEVEL === 'debug') {
      const level = logLevels.DEBUG;
      consoleLog(level, message, data);
      writeToFile(level, message, data);
    }
  },
};

module.exports = logger;
