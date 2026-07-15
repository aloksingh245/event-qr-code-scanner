const express = require('express');
const router = express.Router();
const { registerUser, verifyOTP, resendQR, getQRImage } = require('../controllers/registrationController');
const { registrationLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

router.post('/', registrationLimiter, registerUser);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);
router.post('/qr/resend', registrationLimiter, resendQR);
router.get('/qr/:qrCodeId', getQRImage);

module.exports = router;
