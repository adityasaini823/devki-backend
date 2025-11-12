// Validation utilities
const validateMobile = (mobile) => {
  // Supports international format: +919876543210 or 9876543210 (10 digits starting with 6-9)
  const mobileRegex = /^(\+91)?[6-9-]\d{9}$/;
  const cleanMobile = mobile.replace(/[\s-]/g, '');
  return mobileRegex.test(cleanMobile);
};

const validateOTP = (otp) => {
  // OTP should be exactly 6 digits
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

const validateName = (name) => {
  return name && name.trim().length >= 2;
};

// Format mobile number to standard format
const formatMobile = (mobile) => {
  const cleanMobile = mobile.replace(/[\s-]/g, '');
  if (cleanMobile.startsWith('+91')) {
    return cleanMobile;
  }
  if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
    return '+' + cleanMobile;
  }
  if (cleanMobile.length === 10) {
    return '+91' + cleanMobile;
  }
  return cleanMobile;
};

const validateSendLoginOTP = (req, res, next) => {
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  
  // Check if req.body exists
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Request body is missing or invalid. Please ensure Content-Type is application/json and body is sent.',
    });
  }

  const { mobile } = req.body;

  if (!mobile || !validateMobile(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number',
    });
  }

  // Format mobile number
  req.body.mobile = formatMobile(mobile);
  next();
};

const validateVerifyLoginOTP = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Request body is missing or invalid. Please ensure Content-Type is application/json and body is sent.',
    });
  }

  const { mobile, otp } = req.body;

  if (!mobile || !validateMobile(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid mobile number',
    });
  }

  if (!otp || !validateOTP(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 6-digit OTP',
    });
  }

  req.body.mobile = formatMobile(mobile);
  next();
};

const validateSendSignupOTP = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Request body is missing or invalid. Please ensure Content-Type is application/json and body is sent.',
    });
  }

  const { mobile } = req.body;

  if (!mobile || !validateMobile(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number',
    });
  }

  req.body.mobile = formatMobile(mobile);
  next();
};

const validateVerifySignupOTP = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Request body is missing or invalid. Please ensure Content-Type is application/json and body is sent.',
    });
  }

  const { name, mobile, otp } = req.body;

  if (!name || !validateName(name)) {
    return res.status(400).json({
      success: false,
      message: 'Name must be at least 2 characters long',
    });
  }

  if (!mobile || !validateMobile(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid mobile number',
    });
  }

  if (!otp || !validateOTP(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 6-digit OTP',
    });
  }

  req.body.mobile = formatMobile(mobile);
  next();
};

export {
  validateMobile,
  validateOTP,
  validateName,
  formatMobile,
  validateSendLoginOTP,
  validateVerifyLoginOTP,
  validateSendSignupOTP,
  validateVerifySignupOTP,
};

