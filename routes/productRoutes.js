import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
// Note: Add admin auth middleware later for create/update/delete routes

const router = express.Router();

// Get all active products (public)
router.get('/', getProducts);

// Get single product (public)
router.get('/:id', getProductById);

// Create product (admin - add auth later)
router.post('/', createProduct);

// Update product (admin - add auth later)
router.patch('/:id', updateProduct);

// Delete product (admin - add auth later)
router.delete('/:id', deleteProduct);

export default router;

