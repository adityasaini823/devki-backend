import twilio from 'twilio';
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const otpStore = new Map(); // mobile -> { otp, expiresAt }
const client = twilio(accountSid, authToken);

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiration (5 minutes)
const storeOTP = (mobile, otp) => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(mobile, { otp, expiresAt });
  console.log(otpStore);
  // Cleanup expired OTPs
  setTimeout(() => {
    otpStore.delete(mobile);
  }, 5 * 60 * 1000);
};

// Verify OTP
const verifyOTP = (mobile, otp) => {
  const stored = otpStore.get(mobile);
  
  if (!stored) {
    return { valid: false, message: 'OTP not found or expired' };
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(mobile);
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // OTP verified successfully - remove it (one-time use)
  otpStore.delete(mobile);
  return { valid: true, message: 'OTP verified successfully' };
};

// Send OTP (in production, integrate with SMS service like Twilio, AWS SNS, etc.)
const sendOTP = async (mobile, otp) => {

  const message = await client.messages.create({
    body: `Your Devki Verification code - ${otp}`,
    from: "+1906 422 6190",
    to: mobile,
  });

  console.log(message);
  
  // Simulate sending delay
  return { success: true, message: 'OTP sent successfully' };
};

// Main function: Generate and send OTP
const generateAndSendOTP = async (mobile) => {
  try {
    const otp = generateOTP();
    storeOTP(mobile, otp);
    await sendOTP(mobile, otp);
    return {
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp }),
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

