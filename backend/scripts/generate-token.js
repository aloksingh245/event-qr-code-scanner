require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateManualToken = async () => {
  const username = process.argv[2] || 'scanner';
  const password = process.argv[3] || 'pass123';

  if (!process.env.SCANNER_SECRET) {
    console.error("❌ SCANNER_SECRET is missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find or create user
    let user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      user = new User({ username, password, role: 'scanner' });
      await user.save();
      console.log(`🎉 Created a new scanner account: "${username}"`);
    }

    // Sign token valid for 8 hours
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.SCANNER_SECRET,
      { expiresIn: '8h' }
    );

    console.log("\n=======================================================");
    console.log("🎟️  MANUAL JWT SCANNER TOKEN (Expires in 8 hours):");
    console.log("=======================================================\n");
    console.log(token);
    console.log("\n=======================================================");
    console.log(`Username associated: ${user.username}`);
    console.log("=======================================================\n");

  } catch (error) {
    console.error("❌ Error generating manual token:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

generateManualToken();
