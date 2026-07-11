const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/../.env' });

const Registration = require('../models/Registration');

async function generateTestQR() {
  console.log("=========================================");
  console.log("🎟️  GENERATING SCANNABLE TEST QR CODE");
  console.log("=========================================\n");

  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to Database.");

    // 2. Create a unique User/Registration
    const qrCodeId = uuidv4();
    const email = `test-user-${Date.now()}@example.com`;
    
    await Registration.create({
      name: 'Super Scannable Tester',
      email: email,
      qrCodeId: qrCodeId,
      status: 'VALID' // Mark valid so it is scannable immediately
    });

    console.log(`✅ Registered dummy user: ${email}`);
    console.log(`✅ Assigned secure QR Code ID: ${qrCodeId}`);

    // 3. Generate the QR Code Payload (Opaque QR code ID)
    const qrPayload = JSON.stringify({
      qrCodeId: qrCodeId
    });

    // 4. Generate and save the QR Code as a PNG image in the backend root folder
    const filePath = __dirname + '/../test-ticket.png';
    await QRCode.toFile(filePath, qrPayload, {
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF' // White background
      },
      width: 400,
      margin: 2
    });

    console.log(`\n🎉 SUCCESS! Scannable QR code saved to: ${filePath}`);
    console.log("👉 Open 'test-ticket.png' on your computer and point your phone/scanner at it!");

  } catch (error) {
    console.error("❌ Error generating QR code:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

generateTestQR();
