const QRCode = require('qrcode');

const generateQR = async (payload) => {
  try {
    // Generate QR code as Base64 encoded string
    const qrImageBase64 = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H', // High error correction
      margin: 1,
      width: 300
    });
    return qrImageBase64;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateQR
};
