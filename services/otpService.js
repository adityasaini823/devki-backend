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

const storeOTP = async(mobile, otp) => {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const expiresAtTimestamp = Date.now() + 5 * 60 * 1000;
  
  let user = await User.findOneAndUpdate(
    { mobile: mobile }, 
    { $set: { otp: otp, otp_expiresAt: fiveMinutesFromNow } }, 
    { new: true }
  );
  
  if (!user) {
    otpStore.set(mobile, { otp, expiresAt: expiresAtTimestamp });
    return null;
  }
  
  return user;
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
      from: "+1906 422 6190",
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
      message: 'Failed to send OTP. Please try again.',
    };
  }
};

export {
  generateAndSendOTP,
  verifyOTP,
};

