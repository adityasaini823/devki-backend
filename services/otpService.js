import twilio from 'twilio';
import User from '../models/User.js';
import logger from '../logger.js';

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const otpStore = new Map();
const client = twilio(accountSid, authToken);

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const checkRateLimit = async (mobile) => {
  const RATE_LIMIT_SECONDS = 60;
  const HOURLY_LIMIT = 3;
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  // Helper to check attempts
  const checkAttempts = (lastSentAt, attempts) => {
    // 1. Check 60s cooldown
    if (lastSentAt) {
      const lastSent = new Date(lastSentAt).getTime();
      const diff = (now - lastSent) / 1000;
      if (diff < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - diff);
        throw new Error(`Please wait ${waitTime} seconds before requesting a new OTP`);
      }
    }

    // 2. Check hourly limit (3 per hour)
    if (attempts && attempts.length > 0) {
      // Filter attempts within the last hour
      const recentAttempts = attempts.filter(time => {
        const timestamp = new Date(time).getTime();
        return (now - timestamp) < ONE_HOUR;
      });

      if (recentAttempts.length >= HOURLY_LIMIT) {
        // Find when the ability to send resets (oldest attempt + 1 hour)
        // recentAttempts is likely sorted, but let's be safe
        const sortedAttempts = recentAttempts.sort((a, b) => new Date(a) - new Date(b));
        const oldestAttempt = new Date(sortedAttempts[0]).getTime();
        const resetTime = oldestAttempt + ONE_HOUR;
        const waitTimeMinutes = Math.ceil((resetTime - now) / (60 * 1000));

        throw new Error(`Rate limit exceeded. You can send up to ${HOURLY_LIMIT} OTPs per hour. Please try again in ${waitTimeMinutes} minutes.`);
      }
    }
  };

  // Check DB for existing user
  const user = await User.findOne({ mobile });
  if (user) {
    checkAttempts(user.lastOtpSentAt, user.otpAttempts);
    return;
  }

  // Check memory store for non-existing users
  const storedData = otpStore.get(mobile);
  if (storedData) {
    checkAttempts(storedData.lastSentAt, storedData.attempts);
  }
};

const storeOTP = async (mobile, otp) => {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const expiresAtTimestamp = Date.now() + 5 * 60 * 1000;
  const now = new Date(); // Current time object
  const nowTs = Date.now(); // Current timestamp number

  // 1. Try to update existing user
  // We need to fetch firstly to get current otpAttempts, or we can use $push
  // But we want to filter out old attempts to keep the array clean.
  // Using findOneAndUpdate with pipeline is complex, simpler to find then save or two updates.
  // Actually, standard findOne + save is easier for array manipulation logic

  let user = await User.findOne({ mobile });

  if (user) {
    // Clean up attempts older than 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    const currentAttempts = user.otpAttempts || [];
    const recentAttempts = currentAttempts.filter(time => (nowTs - new Date(time).getTime()) < ONE_HOUR);

    // Add new attempt
    recentAttempts.push(now);

    user.otp = otp;
    user.otp_expiresAt = fiveMinutesFromNow;
    user.lastOtpSentAt = now;
    user.otpAttempts = recentAttempts;
    user.otp_expiresAt = fiveMinutesFromNow;

    await user.save();
    return user;
  }

  // 2. Handle non-existing user (Memory Store)
  const existingStore = otpStore.get(mobile) || { attempts: [] };

  // Clean up old attempts in memory
  const ONE_HOUR = 60 * 60 * 1000;
  const validAttempts = (existingStore.attempts || []).filter(ts => (nowTs - ts) < ONE_HOUR);
  validAttempts.push(nowTs);

  otpStore.set(mobile, {
    otp,
    expiresAt: expiresAtTimestamp,
    lastSentAt: nowTs,
    attempts: validAttempts
  });

  return null;
};

const verifyOTP = async (mobile, otp) => {
  let user = await User.findOne({ mobile: mobile });

  if (user) {
    if (user.otp !== otp) {
      throw new Error('Invalid OTP');
    }
    const expiresAt = user.otp_expiresAt instanceof Date
      ? user.otp_expiresAt.getTime()
      : user.otp_expiresAt;
    if (Date.now() > expiresAt) {
      throw new Error('OTP has expired');
    }
    return user;
  } else {
    const storedOTP = otpStore.get(mobile);
    if (!storedOTP) {
      throw new Error('User not found');
    }
    if (storedOTP.otp !== otp) {
      throw new Error('Invalid OTP');
    }
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(mobile);
      throw new Error('OTP has expired');
    }
    return null;
  }
};

const sendOTP = async (mobile, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Devki Verification code - ${otp} is valid for 5 minutes`,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: mobile,
    });

    if (process.env.NODE_ENV === 'development') {
      logger.debug('OTP sent via Twilio:', { messageSid: message.sid, to: mobile });
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error('Failed to send OTP via Twilio:', error);
    throw error;
  }
};

const generateAndSendOTP = async (mobile) => {
  try {
    await checkRateLimit(mobile);
    const otp = generateOTP();
    await storeOTP(mobile, otp);
    await sendOTP(mobile, otp);
    return {
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
  } catch (error) {
    logger.error('Error generating and sending OTP:', error);
    return {
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
    };
  }
};

export {
  generateAndSendOTP,
  verifyOTP,
};

