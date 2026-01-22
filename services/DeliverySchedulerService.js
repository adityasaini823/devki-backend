import Subscription from '../models/Subscription.js';
import SubscriptionDelivery from '../models/SubscriptionDelivery.js';
import SubscriptionProduct from '../models/SubscriptionProducts.js';
import logger from '../logger.js';

/**
 * DeliverySchedulerService
 * 
 * Generates delivery records for the next 7 days based on active subscriptions.
 * Run this daily via cron or call manually.
 */

// Helper to get day of week (0 = Sunday, 6 = Saturday)
const getDayOfWeek = (date) => date.getDay();

// Check if a date should have a delivery based on frequency
const shouldDeliverOnDate = (date, frequency) => {
    const dayOfWeek = getDayOfWeek(date);

    switch (frequency) {
        case 'daily':
            return true;
        case 'weekdays':
            return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
        case 'weekly':
            // Deliver on Mondays
            return dayOfWeek === 1;
        case 'biweekly':
            // Deliver on 1st and 15th of month
            const dayOfMonth = date.getDate();
            return dayOfMonth === 1 || dayOfMonth === 15;
        default:
            return false;
    }
};

// Generate deliveries for a single subscription for the next N days
const generateDeliveriesForSubscription = async (subscription, daysAhead = 7) => {
    const deliveriesCreated = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get product details
    const product = await SubscriptionProduct.findById(subscription.subscription_product_id);
    if (!product) {
        logger.warn(`Subscription ${subscription._id} has invalid product reference`);
        return deliveriesCreated;
    }

    for (let i = 1; i <= daysAhead; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);

        // Check if this date qualifies for delivery
        if (!shouldDeliverOnDate(targetDate, subscription.frequency)) {
            continue;
        }

        // Check if delivery already exists for this date
        const existingDelivery = await SubscriptionDelivery.findOne({
            subscription_id: subscription._id,
            scheduled_date: {
                $gte: targetDate,
                $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
        });

        if (existingDelivery) {
            continue; // Already scheduled
        }

        // Create delivery record
        const delivery = await SubscriptionDelivery.create({
            subscription_id: subscription._id,
            user_id: subscription.user_id,
            scheduled_date: targetDate,
            delivery_time: subscription.delivery_time,
            product_quantity: product.quantity,
            price: product.price_per_delivery, // Uses dynamic current price
            status: 'scheduled',
            payment_status: 'pending',
        });

        deliveriesCreated.push(delivery);
    }

    return deliveriesCreated;
};

// Generate deliveries for all active subscriptions
const generateAllDeliveries = async (daysAhead = 7) => {
    try {
        logger.info('Starting delivery generation...');

        const activeSubscriptions = await Subscription.find({ status: 'active' });
        logger.info(`Found ${activeSubscriptions.length} active subscriptions`);

        let totalCreated = 0;

        for (const subscription of activeSubscriptions) {
            const created = await generateDeliveriesForSubscription(subscription, daysAhead);
            totalCreated += created.length;
        }

        logger.info(`Delivery generation complete. Created ${totalCreated} new delivery records.`);

        return {
            success: true,
            subscriptionsProcessed: activeSubscriptions.length,
            deliveriesCreated: totalCreated,
        };
    } catch (error) {
        logger.error('Delivery generation error:', error);
        throw error;
    }
};

// Mark overdue scheduled deliveries as missed (run daily)
const markOverdueAsMissed = async () => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        const result = await SubscriptionDelivery.updateMany(
            {
                status: 'scheduled',
                scheduled_date: { $lte: yesterday },
            },
            {
                $set: {
                    status: 'missed',
                    payment_status: 'not_applicable',
                    notes: 'Auto-marked as missed (overdue)',
                    updatedAt: new Date(),
                },
            }
        );

        logger.info(`Marked ${result.modifiedCount} overdue deliveries as missed`);
        return result.modifiedCount;
    } catch (error) {
        logger.error('Mark overdue error:', error);
        throw error;
    }
};

export {
    generateDeliveriesForSubscription,
    generateAllDeliveries,
    markOverdueAsMissed,
    shouldDeliverOnDate,
};
