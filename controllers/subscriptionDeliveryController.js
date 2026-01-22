import SubscriptionDelivery from '../models/SubscriptionDelivery.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import logger from '../logger.js';
import { generateAllDeliveries as generateDeliveriesService } from '../services/DeliverySchedulerService.js';

// Get upcoming deliveries for logged-in user
const getUserDeliveries = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, limit = 14 } = req.query;

        const query = { user_id: userId };
        if (status) {
            query.status = status;
        }

        const deliveries = await SubscriptionDelivery.find(query)
            .sort({ scheduled_date: 1 })
            .limit(parseInt(limit))
            .populate('subscription_id', 'delivery_time frequency')
            .select('-__v');

        return res.status(200).json({
            success: true,
            deliveries,
        });
    } catch (error) {
        logger.error('Get user deliveries error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Skip a delivery (user)
const skipDelivery = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { notes } = req.body;

        const delivery = await SubscriptionDelivery.findOne({
            _id: id,
            user_id: userId,
            status: 'scheduled',
        });

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found or cannot be skipped',
            });
        }

        // Check if delivery is in the future
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(delivery.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);

        if (scheduledDate <= now) {
            return res.status(400).json({
                success: false,
                message: 'Cannot skip past or today\'s delivery',
            });
        }

        delivery.status = 'skipped';
        delivery.skipped_by = 'user';
        delivery.payment_status = 'not_applicable';
        delivery.notes = notes || 'Skipped by user';
        delivery.updatedAt = new Date();
        await delivery.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery skipped successfully',
            delivery,
        });
    } catch (error) {
        logger.error('Skip delivery error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// ===== ADMIN ENDPOINTS =====

// Get all deliveries for a date (Admin)
const getDeliveriesByDate = async (req, res) => {
    try {
        const { date, status, delivery_time, page = 1, limit = 50 } = req.query;

        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(queryDate);
        nextDay.setDate(queryDate.getDate() + 1);

        const query = {
            scheduled_date: { $gte: queryDate, $lt: nextDay },
        };

        if (status) query.status = status;
        if (delivery_time) query.delivery_time = delivery_time;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [deliveries, total] = await Promise.all([
            SubscriptionDelivery.find(query)
                .sort({ delivery_time: 1, scheduled_date: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user_id', 'first_name last_name mobile address city state pincode')
                .populate('subscription_id', 'delivery_time frequency')
                .select('-__v'),
            SubscriptionDelivery.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            deliveries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        logger.error('Get deliveries by date error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Mark delivery as delivered (Admin) - deducts from wallet
const markDelivered = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const delivery = await SubscriptionDelivery.findById(id).populate('user_id');

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        if (delivery.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as delivered. Current status: ${delivery.status}`,
            });
        }

        // Check wallet balance
        const user = await User.findById(delivery.user_id._id);
        if (user.wallet_balance < delivery.price) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance for this delivery',
                shortfall: delivery.price - user.wallet_balance,
            });
        }

        // Deduct from wallet
        user.wallet_balance -= delivery.price;
        await user.save();

        // Update delivery status
        delivery.status = 'delivered';
        delivery.payment_status = 'deducted';
        delivery.delivered_at = new Date();
        if (notes) delivery.notes = notes;
        delivery.updatedAt = new Date();
        await delivery.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery marked as delivered and wallet charged',
            delivery,
            wallet_balance: user.wallet_balance,
        });
    } catch (error) {
        logger.error('Mark delivered error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Skip delivery (Admin)
const adminSkipDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const delivery = await SubscriptionDelivery.findById(id);

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        if (delivery.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: `Cannot skip. Current status: ${delivery.status}`,
            });
        }

        delivery.status = 'skipped';
        delivery.skipped_by = 'admin';
        delivery.payment_status = 'not_applicable';
        delivery.notes = notes || 'Skipped by admin';
        delivery.updatedAt = new Date();
        await delivery.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery skipped by admin',
            delivery,
        });
    } catch (error) {
        logger.error('Admin skip delivery error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Mark delivery as missed (Admin)
const markMissed = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const delivery = await SubscriptionDelivery.findById(id);

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        if (delivery.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as missed. Current status: ${delivery.status}`,
            });
        }

        delivery.status = 'missed';
        delivery.payment_status = 'not_applicable';
        delivery.notes = notes || 'Marked as missed by admin';
        delivery.updatedAt = new Date();
        await delivery.save();

        return res.status(200).json({
            success: true,
            message: 'Delivery marked as missed (no charge)',
            delivery,
        });
    } catch (error) {
        logger.error('Mark missed error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Generate deliveries for all active subscriptions (Admin)
const generateDeliveries = async (req, res) => {
    try {
        const { days = 7 } = req.query;

        logger.info(`Admin triggered delivery generation for ${days} days`);

        const result = await generateDeliveriesService(parseInt(days));

        return res.status(200).json({
            success: true,
            message: `Deliveries generated successfully`,
            ...result,
        });
    } catch (error) {
        logger.error('Generate deliveries error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate deliveries',
        });
    }
};

export {
    getUserDeliveries,
    skipDelivery,
    getDeliveriesByDate,
    markDelivered,
    adminSkipDelivery,
    markMissed,
    generateDeliveries,
};
