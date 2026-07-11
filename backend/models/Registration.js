const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  // UUID v4 identifier for the QR Code
  qrCodeId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // To handle ticket cancellations/revocations/verification
  status: { 
    type: String, 
    enum: ['PENDING_VERIFICATION', 'VALID', 'CANCELLED'], 
    default: 'PENDING_VERIFICATION' 
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  
  // --- Attendance Fields ---
  scanned: { 
    type: Boolean, 
    default: false 
  },
  scanTime: { 
    type: Date, 
    default: null 
  },

  scannerId: { 
    type: String, 
    default: null 
  }
}, { 
  timestamps: true 
});

// 1. Unique index on email to prevent duplicate registration for the single event
registrationSchema.index({ email: 1 }, { unique: true });

// 2. Index to optimize gate scanning checks
registrationSchema.index({ qrCodeId: 1, scanned: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
