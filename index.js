import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import subscriptionProductRoutes from './routes/subscriptionProductRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { connectToMongo } from './config/db.js';
import morganMiddleware from './middleware/morganMiddleware.js';
import logger from './logger.js';

const app = express();

connectToMongo();

// CORS configuration - allow credentials for cookies
app.use(cors({
  origin: process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(morganMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Devki API Server is running',
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscription-products', subscriptionProductRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Server accessible at http://localhost:${PORT}`);
}); 