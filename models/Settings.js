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
    delivery: {
        slots: [{
            id: { type: String, required: true }, // e.g., 'morning'
            label: { type: String, required: true }, // e.g., 'Morning'
            startTime: { type: String, required: true }, // e.g., '06:00'
            endTime: { type: String, required: true }, // e.g., '08:00'
            isEnabled: { type: Boolean, default: true }
        }]
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
