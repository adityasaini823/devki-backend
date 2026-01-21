import User from "../models/User.js";
import WalletTransaction from "../models/Wallet.js";
import logger from "../logger.js";

// Get wallet balance
export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("wallet_balance first_name last_name");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        balance: user.wallet_balance || 0,
        user: {
          name: `${user.first_name} ${user.last_name || ""}`.trim(),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting wallet balance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get wallet balance",
      error: error.message,
    });
  }
};

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, type } = req.query;

    const query = { user_id: userId };
    if (type && ["deposit", "withdrawal"].includes(type)) {
      query.transaction_type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WalletTransaction.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting wallet transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get wallet transactions",
      error: error.message,
    });
  }
};

// Add money to wallet (deposit request - stays pending until admin approves)
export const addMoneyToWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, payment_method, payment_id, remarks } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (amount < 10) {
      return res.status(400).json({
        success: false,
        message: "Minimum deposit amount is ₹10",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create transaction record with PENDING status
    // Money will only be added when admin approves this transaction
    const transaction = new WalletTransaction({
      user_id: userId,
      transaction_type: "deposit",
      amount,
      status: "pending", // Stays pending until admin approves
      payment_method: payment_method || "upi",
      payment_id: payment_id || null, // This is the transaction ID/Reference number
      payment_proof: req.body.payment_proof || null, // Screenshot URL
      remarks: remarks || null,
    });

    await transaction.save();

    logger.info(`User ${userId} requested to add ₹${amount} to wallet (pending admin approval)`);

    return res.status(200).json({
      success: true,
      message: "Deposit request submitted successfully. It will be credited to your wallet once approved by admin.",
      data: {
        transaction: transaction,
        current_balance: user.wallet_balance || 0,
      },
    });
  } catch (error) {
    logger.error("Error adding money to wallet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit deposit request",
      error: error.message,
    });
  }
};

// Request withdrawal
export const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bank_account } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is ₹100",
      });
    }

    if (!bank_account || !bank_account.account_number || !bank_account.ifsc_code || !bank_account.account_holder_name) {
      return res.status(400).json({
        success: false,
        message: "Bank account details are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentBalance = user.wallet_balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        current_balance: currentBalance,
      });
    }

    // Create withdrawal request
    const transaction = new WalletTransaction({
      user_id: userId,
      transaction_type: "withdrawal",
      amount,
      status: "pending",
      bank_account: {
        account_number: bank_account.account_number,
        ifsc_code: bank_account.ifsc_code,
        account_holder_name: bank_account.account_holder_name,
      },
    });

    await transaction.save();

    // Deduct amount from wallet (will be refunded if withdrawal is rejected)
    user.wallet_balance = currentBalance - amount;
    await user.save();

    logger.info(`User ${userId} requested withdrawal of ₹${amount}`);

    return res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully. It will be processed within 2-3 business days.",
      data: {
        transaction: transaction,
        new_balance: user.wallet_balance,
      },
    });
  } catch (error) {
    logger.error("Error requesting withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request withdrawal",
      error: error.message,
    });
  }
};

