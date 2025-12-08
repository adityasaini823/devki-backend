import Subscription from '../models/Subscription.js';
import SubscriptionProduct from '../models/SubscriptionProducts.js';
import User from '../models/User.js';
import logger from '../logger.js';

// Helper function to calculate deliveries per month based on frequency
const getDeliveriesPerMonth = (frequency) => {
  const frequencyMap = {
    daily: 30,
    weekdays: 22,
    weekly: 4,
    biweekly: 2,
  };
  return frequencyMap[frequency] || 0;
};

// Create or update subscription
const createOrUpdateSubscription = async (req, res) => {
  try {
    // const userId = req.user.userId;
    const userId = '691ec17b03643ec7d779faf4';
    const { subscription_product_id, delivery_time, frequency } = req.body;

    // Validate required fields
    if (!subscription_product_id || !delivery_time || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subscription_product_id, delivery_time, and frequency',
      });
    }

    // Validate enum values
    const validDeliveryTimes = ['morning', 'evening'];
    const validFrequencies = ['daily', 'weekdays', 'weekly', 'biweekly'];

    if (!validDeliveryTimes.includes(delivery_time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery_time. Must be morning or evening',
      });
    }

    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid frequency. Must be one of: daily, weekdays, weekly, biweekly',
      });
    }

    // Fetch the subscription product
    const product = await SubscriptionProduct.findById(subscription_product_id);
    if (!product || !product.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Subscription product not found or inactive',
      });
    }

    // Calculate values
    const price_per_delivery = product.price_per_delivery;
    const deliveries_per_month = getDeliveriesPerMonth(frequency);
    const monthly_estimate = price_per_delivery * deliveries_per_month;

    // Check if user has an active subscription
    let subscription = await Subscription.findOne({
      user_id: userId,
      status: 'active',
    });

    if (subscription) {
      // Update existing subscription
      subscription.subscription_product_id = subscription_product_id;
      subscription.price_per_delivery = price_per_delivery;
      subscription.delivery_time = delivery_time;
      subscription.frequency = frequency;
      subscription.deliveries_per_month = deliveries_per_month;
      subscription.monthly_estimate = monthly_estimate;
      subscription.updatedAt = new Date();
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        user_id: userId,
        subscription_product_id: subscription_product_id,
        price_per_delivery,
        delivery_time,
        frequency,
        deliveries_per_month,
        monthly_estimate,
        status: 'active',
        start_date: new Date(),
      });
    }

    // Populate product details for response
    await subscription.populate('subscription_product_id', 'quantity name price_per_delivery image');

    return res.status(200).json({
      success: true,
      message: subscription.updatedAt > subscription.createdAt ? 'Subscription updated successfully' : 'Subscription created successfully',
      subscription: {
        id: subscription._id,
        subscription_product: {
          id: subscription.subscription_product_id._id,
          quantity: subscription.subscription_product_id.quantity,
          name: subscription.subscription_product_id.name,
          price_per_delivery: subscription.subscription_product_id.price_per_delivery,
        },
        delivery_time: subscription.delivery_time,
        frequency: subscription.frequency,
        deliveries_per_month: subscription.deliveries_per_month,
        price_per_delivery: subscription.price_per_delivery,
        monthly_estimate: subscription.monthly_estimate,
        status: subscription.status,
        start_date: subscription.start_date,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Create/Update subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get user's subscription
const getSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      user_id: userId,
      status: 'active',
    })
      .populate('subscription_product_id', 'quantity name price_per_delivery image')
      .select('-__v');

    if (!subscription) {
      return res.status(200).json({
        success: true,
        message: 'No active subscription found',
        subscription: null,
      });
    }

    return res.status(200).json({
      success: true,
      subscription: {
        id: subscription._id,
        subscription_product: {
          id: subscription.subscription_product_id._id,
          quantity: subscription.subscription_product_id.quantity,
          name: subscription.subscription_product_id.name,
          price_per_delivery: subscription.subscription_product_id.price_per_delivery,
          image: subscription.subscription_product_id.image,
        },
        delivery_time: subscription.delivery_time,
        frequency: subscription.frequency,
        deliveries_per_month: subscription.deliveries_per_month,
        price_per_delivery: subscription.price_per_delivery,
        monthly_estimate: subscription.monthly_estimate,
        status: subscription.status,
        start_date: subscription.start_date,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Pause subscription
const pauseSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      user_id: userId,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    subscription.status = 'paused';
    subscription.updatedAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription paused successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
      },
    });
  } catch (error) {
    logger.error('Pause subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      user_id: userId,
      status: { $in: ['active', 'paused'] },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found to cancel',
      });
    }

    subscription.status = 'cancelled';
    subscription.updatedAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
      },
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  createOrUpdateSubscription,
  getSubscription,
  pauseSubscription,
  cancelSubscription,
};

