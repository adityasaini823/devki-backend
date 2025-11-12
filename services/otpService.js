import twilio from 'twilio';
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const otpStore = new Map(); // mobile -> { otp, expiresAt }
const client = twilio(accountSid, authToken);
import User from '../models/User.js';
// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = async(mobile, otp) => {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const expiresAtTimestamp = Date.now() + 5 * 60 * 1000; // For in-memory store
  
  // Try to update existing user
  let user = await User.findOneAndUpdate(
    { mobile: mobile }, 
    { $set: { otp: otp, otp_expiresAt: fiveMinutesFromNow } }, 
    { new: true }
  );
  
  // If user doesn't exist, store OTP in memory temporarily
  if (!user) {
    otpStore.set(mobile, { otp, expiresAt: expiresAtTimestamp });
    return null; // User doesn't exist yet
  }
  
  return user;
};

const verifyOTP = async (mobile, otp) => {
  // First check if user exists in database
  let user = await User.findOne({ mobile: mobile });
  
  if (user) {
    // User exists, verify OTP from database
    if (user.otp !== otp) {
      throw new Error('Invalid OTP');
    }
    // Convert Date to timestamp for comparison
    const expiresAt = user.otp_expiresAt instanceof Date 
      ? user.otp_expiresAt.getTime() 
      : user.otp_expiresAt;
    if (Date.now() > expiresAt) {
      throw new Error('OTP has expired');
    }
    return user;
  } else {
    // User doesn't exist, check in-memory store
    const storedOTP = otpStore.get(mobile);
    if (!storedOTP) {
      throw new Error('User not found');
    }
    if (storedOTP.otp !== otp) {
      throw new Error('Invalid OTP');
    }
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(mobile); // Clean up expired OTP
      throw new Error('OTP has expired');
    }
    // OTP verified, but user doesn't exist yet - return null
    // The controller will handle creating the user
    return null;
  }
};

const sendOTP = async (mobile, otp) => {

  const message = await client.messages.create({
    body: `Your Devki Verification code - ${otp} is valid for 5 minutes`,
    from: "+1906 422 6190",
    to: mobile,
  });

  console.log(message);
  
  // Simulate sending delay
  return { success: true, message: 'OTP sent successfully' };
};

const generateAndSendOTP = async (mobile) => {
  try {
    const otp = generateOTP();
    await storeOTP(mobile, otp);
    await sendOTP(mobile, otp);
    return {
      success: true,
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Include OTP in dev mode
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
    };
  }
};

export {
  generateAndSendOTP,
  verifyOTP,
};

