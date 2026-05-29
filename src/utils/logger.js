'use strict';

// Simple console logger
const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  silent: process.env.NODE_ENV === 'test',
};

if (logger.silent) {
  logger.info = () => {};
  logger.warn = () => {};
  logger.error = () => {};
}

module.exports = logger;
