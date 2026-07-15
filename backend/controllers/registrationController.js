const Registration = require('../models/Registration');
const { v4: uuidv4 } = require('uuid');
const qrService = require('../services/qrService');
const mailService = require('../services/mailService');

// Simple Promise-based queue/lock to serialize registration checks & inserts
let registrationLock = Promise.resolve();

// @desc    Register user for the single event (Generates and sends OTP)
// @route   POST /api/registrations
// @access  Public
const registerUser = async (req, res) => {
  const { name, email } = req.body;
  const eventName = process.env.EVENT_NAME || "Grand Event 2026";
  const eventCapacity = parseInt(process.env.EVENT_CAPACITY) || 300;

  // Acquire lock to serialize registration check and insertion
  const currentLock = registrationLock;
  let release;
  registrationLock = new Promise(resolve => {
    release = resolve;
  });
  await currentLock;

  try {
    // 1. Check if user already registered (Duplicate Check)
    const existingRegistration = await Registration.findOne({ email });
    
    if (existingRegistration) {
      if (existingRegistration.status === 'VALID') {
        return res.status(409).json({ message: 'User already registered for this event' });
      }
      
      // If PENDING_VERIFICATION, we update details and send a new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      existingRegistration.name = name;
      existingRegistration.otp = otp;
      existingRegistration.otpExpires = otpExpires;
      await existingRegistration.save();

      mailService.sendOTPEmail(email, name, eventName, otp)
        .catch(err => console.error(`Failed to send OTP to ${email}:`, err));

      return res.status(200).json({
        success: true,
        message: 'Verification code re-sent. Please check your email.',
        email
      });
    }

    // 2. Capacity Check
    const activeCount = await Registration.countDocuments({ status: { $ne: 'CANCELLED' } });
    if (activeCount >= eventCapacity) {
      return res.status(400).json({ message: 'Event is fully booked' });
    }

    // 3. Create Registration with UUID v4, PENDING_VERIFICATION state, and OTP
    const qrCodeId = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await Registration.create({
      name,
      email,
      qrCodeId,
      status: 'PENDING_VERIFICATION',
      otp,
      otpExpires
    });

    // 4. Send Verification Code Email (Non-blocking)
    mailService.sendOTPEmail(email, name, eventName, otp)
      .catch(err => console.error(`Failed to send OTP email to ${email}:`, err));

    // 5. Respond to user
    res.status(201).json({
      success: true,
      message: 'Verification code sent to your email. Please enter it to complete registration.',
      email
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  } finally {
    // Always release lock
    release();
  }
};

// @desc    Verify OTP and generate/send ticket
// @route   POST /api/registrations/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const eventName = process.env.EVENT_NAME || "Grand Event 2026";

  try {
    // 1. Find the registration pending verification
    const registration = await Registration.findOne({
      email,
      status: 'PENDING_VERIFICATION'
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found or already verified.' });
    }

    // 2. Validate OTP code and expiry
    if (registration.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (registration.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please register again.' });
    }

    // 3. Mark as VALID, clear OTP fields
    registration.status = 'VALID';
    registration.otp = null;
    registration.otpExpires = null;
    await registration.save();

    // 4. Generate QR code
    const qrPayload = JSON.stringify({
      qrCodeId: registration.qrCodeId
    });
    const qrImageBase64 = await qrService.generateQR(qrPayload);

    // 5. Send actual Ticket Email
    mailService.sendQREmail(email, registration.name, eventName, qrImageBase64)
      .catch(err => console.error(`Failed to send QR ticket email to ${email}:`, err));

    res.status(200).json({
      success: true,
      message: 'Verification successful! Your ticket has been sent to your email.',
      qrCodeId: registration.qrCodeId,
      qrCode: qrImageBase64
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// @desc    Secure QR Re-send (Fallback)
// @route   POST /api/registrations/qr/resend
// @access  Public
const resendQR = async (req, res) => {
  const { email } = req.body;
  const eventName = process.env.EVENT_NAME || "Grand Event 2026";

  try {
    // 1. Always return a generic success message to prevent email enumeration
    res.status(200).json({ success: true, message: 'If registered and verified, an email with the QR code has been sent.' });

    // 2. Perform the work asynchronously
    const registration = await Registration.findOne({ email, status: 'VALID' });
    
    if (registration) {
      const qrPayload = JSON.stringify({
        qrCodeId: registration.qrCodeId
      });
      
      const qrImageBase64 = await qrService.generateQR(qrPayload);
      
      mailService.sendQREmail(registration.email, registration.name, eventName, qrImageBase64)
        .catch(err => console.error('QR Resend Email failed:', err));
    }

  } catch (error) {
     console.error('Resend QR Error:', error);
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  resendQR
};
