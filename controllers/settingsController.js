import Settings from '../models/Settings.js';
import logger from '../logger.js';

// Get public settings (no auth required for basic app config)
export const getSettings = async (req, res) => {
    try {
        const settings = await Settings.getInstance();

        return res.status(200).json({
            success: true,
            settings,
        });
    } catch (error) {
        logger.error('Error getting settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get settings',
        });
    }
};

// Update settings (Admin only)
export const updateSettings = async (req, res) => {
    try {
        const { payment, general, delivery } = req.body;

        const settings = await Settings.getInstance();

        if (delivery) {
            settings.delivery = delivery;
        }

        if (payment) {
            if (payment.upi_id) settings.payment.upi_id = payment.upi_id;
            if (payment.minimum_deposit) settings.payment.minimum_deposit = payment.minimum_deposit;
            if (payment.minimum_withdrawal) settings.payment.minimum_withdrawal = payment.minimum_withdrawal;
        }

        if (general) {
            if (general.app_name) settings.general.app_name = general.app_name;
            if (general.support_email) settings.general.support_email = general.support_email;
        }

        await settings.save();

        return res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            settings,
        });
    } catch (error) {
        logger.error('Error updating settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update settings',
        });
    }
};
