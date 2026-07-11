const express = require('express');
const router = express.Router();
const { verifyQR, manualCheckIn, getDashboardData } = require('../controllers/scannerController');
const { protectScanner } = require('../middleware/authMiddleware');

router.post('/verify', protectScanner, verifyQR);
router.post('/manual', protectScanner, manualCheckIn);
router.get('/dashboard', protectScanner, getDashboardData);

module.exports = router;
