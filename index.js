import 'dotenv/config';
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { connectToMongo } from "./config/db.js";
import morganMiddleware from "./middleware/morganMiddleware.js";
import logger from "./logger.js";
const app = express();
// Connect to MongoDB
connectToMongo();
// Middlewares
app.use(cors());
app.use(morganMiddleware);
// Request logging middleware (for debugging)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  logger.info('Headers:', req.headers);
  next();
}); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Devki API Server is running",
    version: "1.0.0",
  });
});

app.use('/api/auth', authRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 