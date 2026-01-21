import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
// Note: Add admin auth middleware later for create/update/delete routes

import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Get all active products (public)
router.get('/', getProducts);

// Get single product (public)
router.get('/:id', getProductById);

// Protected admin routes
router.use(authenticateAdmin);

// Create product
router.post('/', createProduct);

// Update product
router.patch('/:id', updateProduct);

// Delete product
router.delete('/:id', deleteProduct);

export default router;

