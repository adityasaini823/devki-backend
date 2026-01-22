import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    payment: {
        upi_id: {
            type: String,
            default: 'adityasaini2468@okicici', // Default fallback
        },
        // Future extensible fields
        minimum_deposit: {
            type: Number,
            default: 10,
        },
        minimum_withdrawal: {
            type: Number,
            default: 100,
        },
    },
    general: {
        app_name: {
            type: String,
            default: 'Devki App',
        },
        support_email: {
            type: String,
            default: 'support@devki.com',
        },
    },
}, { timestamps: true });

// Ensure only one document exists
settingsSchema.statics.getInstance = async function () {
    const Settings = this;
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
