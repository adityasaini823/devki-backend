import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getWalletBalance,
  getWalletTransactions,
  addMoneyToWallet,
  requestWithdrawal,
} from "../controllers/walletController.js";

const router = express.Router();

// All wallet routes require authentication
router.use(authenticateToken);

// Get wallet balance
router.get("/balance", getWalletBalance);

// Get wallet transactions
router.get("/transactions", getWalletTransactions);

// Add money to wallet
router.post("/add-money", addMoneyToWallet);

// Request withdrawal
router.post("/withdraw", requestWithdrawal);

export default router;

