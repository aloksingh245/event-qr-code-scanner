const express = require('express');
const router = express.Router();
const { registerUser, verifyOTP, resendQR } = require('../controllers/registrationController');

router.post('/', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/qr/resend', resendQR);

module.exports = router;
