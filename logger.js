import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, colorize, errors } = winston.format;

const logDir = 'logs'; // Directory for log files

const logger = winston.createLogger({
  // Default log level: only messages of this level and higher will be logged
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Format the logs as JSON for machine readability
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    json()
  ),
  
  // Define where logs go (Transports)
  transports: [
    // Console Transport: Uses colorized output (best for development)
    new winston.transports.Console({
      format: combine(colorize(), winston.format.simple()),
      level: 'debug', // Log all debug messages and above to console
    }),
    
    // File Transport for general logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'app.log'), 
      level: 'info' // Log info messages and above
    }),
    
    // File Transport for error logs (only errors)
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error', // Only log error messages
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

export default logger;