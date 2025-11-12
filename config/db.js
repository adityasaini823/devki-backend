import mongoose from "mongoose";
const mongoURI = process.env.MONGO_URI;
import logger from "../logger.js";
export const connectToMongo = () => {
        mongoose.connect(mongoURI, {})
    .then(() => {
      logger.info('MongoDB connected successfully!');
    })
    .catch((err) => {
      logger.error('MongoDB connection error:', err);
      process.exit(1); // Exit process with failure
    });
}