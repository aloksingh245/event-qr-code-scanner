const Registration = require('../models/Registration');
const socketHandler = require('../utils/socketHandler');

// @desc    Verify QR Code
// @route   POST /api/scanner/verify
// @access  Private (Scanner JWT)
const verifyQR = async (req, res) => {
  const { qrCodeId } = req.body;
  const scannerId = req.user.id; // Extracted from JWT middleware

  try {
    // 1. Atomic update of scanned status
    const result = await Registration.findOneAndUpdate(
      { qrCodeId, scanned: false, status: 'VALID' },
      { 
        scanned: true, 
        scanTime: new Date(), 
        scannerId 
      },
      { returnDocument: 'after' } // Return the updated document
    );

    // 2. Handle failure cases
    if (!result) {
      const existing = await Registration.findOne({ qrCodeId });
      
      if (!existing) {
        return res.status(404).json({ status: 'INVALID_QR', message: 'QR Code not found in system.' });
      }
      
      if (existing.status === 'CANCELLED') {
        return res.status(403).json({ status: 'CANCELLED_TICKET', message: 'This ticket has been cancelled.' });
      }

      if (existing.status === 'PENDING_VERIFICATION') {
        return res.status(400).json({ status: 'UNVERIFIED_TICKET', message: 'This ticket is not verified yet.' });
      }

      if (existing.scanned) {
        return res.status(409).json({ 
          status: 'ALREADY_SCANNED', 
          message: 'Duplicate Scan Detected!',
          scanTime: existing.scanTime
        });
      }
    }

    // 3. Emit real-time update to dashboard
    const totalScanned = await Registration.countDocuments({ scanned: true });
    
    socketHandler.getIO().emit('attendanceUpdate', {
      name: result.name,
      scanTime: result.scanTime,
      totalScanned
    });

    // 4. Success Response
    res.status(200).json({ 
      status: 'SUCCESS', 
      message: 'Entry Granted',
      attendee: { name: result.name }
    });

  } catch (error) {
    console.error('Scan Error:', error);
    res.status(500).json({ message: 'Server error during scan verification' });
  }
};

// @desc    Manual Check-in (Fallback for broken phones)
// @route   POST /api/scanner/manual
// @access  Private (Scanner/Admin JWT)
const manualCheckIn = async (req, res) => {
    const { email } = req.body;
    const scannerId = req.user.id;
  
    try {
      const result = await Registration.findOneAndUpdate(
        { email, scanned: false, status: 'VALID' },
        { 
          scanned: true, 
          scanTime: new Date(), 
          scannerId 
        },
        { returnDocument: 'after' }
      );
  
      if (!result) {
          const existing = await Registration.findOne({ email });
          if (!existing) return res.status(404).json({ message: 'User not found' });
          if (existing.status === 'PENDING_VERIFICATION') {
              return res.status(400).json({ message: 'This registration has not been verified yet.' });
          }
          if (existing.scanned) return res.status(409).json({ message: 'User already checked in' });
          if (existing.status === 'CANCELLED') return res.status(403).json({ message: 'Ticket Cancelled' });
          return res.status(400).json({ message: 'Unable to check in user.' });
      }

      const totalScanned = await Registration.countDocuments({ scanned: true });
      socketHandler.getIO().emit('attendanceUpdate', {
        name: result.name,
        scanTime: result.scanTime,
        totalScanned
      });
  
      res.status(200).json({ status: 'SUCCESS', message: 'Manual Check-in Successful' });
  
    } catch (error) {
      console.error('Manual Check-in Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

// @desc    Get dashboard stats
// @route   GET /api/scanner/dashboard
// @access  Private (Scanner JWT)
const getDashboardData = async (req, res) => {
  try {
    const eventName = process.env.EVENT_NAME || "Grand Event 2026";
    const capacity = parseInt(process.env.EVENT_CAPACITY) || 300;

    const registeredCount = await Registration.countDocuments({ status: { $ne: 'CANCELLED' } });
    const totalScanned = await Registration.countDocuments({ scanned: true });
    
    // Get latest scans
    const recentScans = await Registration.find({ scanned: true })
      .sort({ scanTime: -1 })
      .limit(50)
      .select('name email scanTime');

    res.status(200).json({
      eventInfo: {
        name: eventName,
        capacity,
        registeredCount
      },
      stats: {
        totalScanned,
        pending: registeredCount - totalScanned
      },
      recentScans
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
};

module.exports = {
  verifyQR,
  manualCheckIn,
  getDashboardData
};
