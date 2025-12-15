import mongoose from "mongoose";
const mongoURI = process.env.MONGO_URI;
import logger from "../logger.js";

export const connectToMongo = () => {
  // Check if MONGO_URI is set
  if (!mongoURI) {
    logger.error('MONGO_URI is not set in environment variables');
    logger.error('Please set MONGO_URI in your .env file');
    process.exit(1);
  }

  // Validate MONGO_URI format
  if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
    logger.error('Invalid MONGO_URI format. Must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }

  // Connection options for better reliability
  const connectionOptions = {
    serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    socketTimeoutMS: 45000, // 45 seconds socket timeout
    connectTimeoutMS: 10000, // 10 seconds connection timeout
    retryWrites: true,
    retryReads: true,
  };

  logger.info('Attempting to connect to MongoDB...');
  
  mongoose.connect(mongoURI, connectionOptions)
    .then(() => {
      logger.info('MongoDB connected successfully!');
      logger.info(`Connected to: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    })
    .catch((err) => {
      logger.error('MongoDB connection error:', err.message);
      
      // Provide helpful error messages based on error type
      if (err.code === 'EREFUSED' || err.name === 'MongoServerSelectionError') {
        logger.error('Possible causes:');
        logger.error('1. Network connectivity issue - Check your internet connection');
        logger.error('2. MongoDB Atlas IP whitelist - Add your IP address in MongoDB Atlas Network Access');
        logger.error('3. Incorrect MONGO_URI - Verify your connection string in .env file');
        logger.error('4. DNS resolution issue - Check if you can resolve the hostname');
      } else if (err.name === 'MongoParseError') {
        logger.error('Invalid MongoDB connection string format');
        logger.error('Please check your MONGO_URI in .env file');
      } else if (err.message.includes('authentication failed')) {
        logger.error('Authentication failed - Check your MongoDB username and password');
      }
      
      logger.error('Full error:', err);
      process.exit(1);
    });
};