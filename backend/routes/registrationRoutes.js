const express = require('express');
const router = express.Router();
const { registerUser, verifyOTP, resendQR } = require('../controllers/registrationController');
const { registrationLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

router.post('/', registrationLimiter, registerUser);
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);
router.post('/qr/resend', registrationLimiter, resendQR);

module.exports = router;
