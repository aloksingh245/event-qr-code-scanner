require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const createScannerUser = async () => {
  const username = process.argv[2] || 'scanner';
  const password = process.argv[3] || 'pass123';

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is missing in .env");
    process.exit(1);
  }

  try {
    console.log(`⏳ Connecting to MongoDB at ${process.env.MONGO_URI}...`);
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if user exists
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      console.log(`⚠️ User "${username}" already exists. Updating password...`);
      existing.password = password;
      await existing.save();
      console.log(`✅ Password updated successfully!`);
    } else {
      const newUser = new User({
        username,
        password,
        role: 'scanner'
      });
      await newUser.save();
      console.log(`🎉 Scanner account created successfully!`);
    }

    console.log("\n==============================================");
    console.log("🔑 LOGIN CREDENTIALS:");
    console.log("==============================================");
    console.log(`Username: ${username.toLowerCase()}`);
    console.log(`Password: ${password}`);
    console.log("==============================================");
    console.log("👉 Go to http://localhost:5173/login to log in.\n");

  } catch (error) {
    console.error("❌ Error setting up scanner account:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createScannerUser();
