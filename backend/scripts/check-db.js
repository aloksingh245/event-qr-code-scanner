require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Registration = require('../models/Registration');

async function checkDatabaseState() {
  console.log("=========================================");
  console.log("🔍 CHECKING DATABASE FOR REGISTRATION & SCANS");
  console.log("=========================================\n");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to Database.");

    const registrations = await Registration.find().sort({ createdAt: -1 }).limit(5);

    if (registrations.length === 0) {
      console.log("No registrations found in the database yet.");
    } else {
      console.log(`Found ${registrations.length} recent registrations:\n`);
      registrations.forEach((reg, index) => {
        console.log(`${index + 1}. Name: ${reg.name}`);
        console.log(`   Email: ${reg.email}`);
        console.log(`   QR Code ID: ${reg.qrCodeId}`);
        if (reg.scanned) {
          console.log(`   🟢 SCANNED: YES (at ${new Date(reg.scanTime).toLocaleString()})`);
        } else {
          console.log(`   🟡 SCANNED: NO (Pending Arrival)`);
        }
        console.log("-----------------------------------------");
      });
    }

  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkDatabaseState();
