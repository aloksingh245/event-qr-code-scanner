require('dotenv').config({ path: __dirname + '/../.env' });
const mailService = require('../services/mailService');
const qrService = require('../services/qrService');

async function testQREmail() {
  console.log("Testing QR email sending to:", process.env.EMAIL_USER);
  try {
    const qrPayload = JSON.stringify({ qrCodeId: "test-uuid-12345" });
    const qrBase64 = await qrService.generateQR(qrPayload);
    console.log("Generated QR code base64 length:", qrBase64.length);
    
    console.log("Sending QR email...");
    await mailService.sendQREmail(process.env.EMAIL_USER, "Alok Test", "Grand Event 2026", qrBase64);
    console.log("✅ QR Email sent successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error sending QR Email:", err);
    process.exit(1);
  }
}

testQREmail();
