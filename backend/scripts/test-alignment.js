const axios = require('axios');
const { io } = require('socket.io-client');
require('dotenv').config({ path: __dirname + '/../.env' });

const API_URL = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

async function testAlignment() {
  console.log("=========================================");
  console.log("🚀 STARTING FRONTEND/BACKEND ALIGNMENT TEST");
  console.log("=========================================\n");

  let qrCodeId = null;
  const socket = io(SOCKET_URL);

  try {
    // 0. Connect to DB to check/create test user
    console.log("-> Initializing test scanner account in database...");
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const Registration = require('../models/Registration');
    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ username: 'scanner' });
    if (!user) {
      user = new User({ username: 'scanner', password: 'pass123', role: 'scanner' });
      await user.save();
    }
    await mongoose.disconnect();

    // 1. Authenticate via login endpoint
    console.log("-> Logging in to acquire JWT token...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'scanner',
      password: 'pass123'
    });
    const token = loginRes.data.token;
    console.log("✅ Logged in successfully! Received token.");

    // Wait for socket to connect
    await new Promise((resolve) => {
      socket.on('connect', () => resolve());
    });
    console.log("✅ [Socket] Connected to backend real-time server.");

    // Setup an event listener to catch the broadcasted scan
    const broadcastPromise = new Promise((resolve, reject) => {
      socket.on('attendanceUpdate', (data) => {
         console.log("✅ [Socket] Received attendanceUpdate broadcast!");
         console.log("   -> Data:", JSON.stringify(data));
         resolve(data);
      });
      // Timeout if not received in 5 seconds
      setTimeout(() => reject(new Error("Socket timeout: Did not receive attendanceUpdate")), 5000);
    });

    // 2. Simulate Frontend Register Form
    console.log("\n-> Simulating Frontend Registration Form Submission...");
    const regRes = await axios.post(`${API_URL}/registrations`, {
      name: 'Alice Frontend Tester',
      email: `alice_${Date.now()}@example.com`
    });

    if (regRes.data.success && regRes.data.qrCodeId) {
      qrCodeId = regRes.data.qrCodeId;
      console.log(`✅ [API] Registration Success! Received QR Code ID: ${qrCodeId}`);
    }

    // 3. Verify OTP (simulate verification step)
    console.log("\n-> Simulating OTP Verification...");
    await mongoose.connect(process.env.MONGO_URI);
    const userReg = await Registration.findOne({ email: regRes.data.email });
    if (!userReg || !userReg.otp) {
      throw new Error("Could not find OTP code in database for test user");
    }
    
    await axios.post(`${API_URL}/registrations/verify-otp`, {
      email: regRes.data.email,
      otp: userReg.otp
    });
    console.log("✅ [API] OTP Verification Success!");
    await mongoose.disconnect();

    // 4. Simulate Dashboard Load
    console.log("\n-> Simulating Dashboard Initial Load...");
    const dashRes = await axios.get(`${API_URL}/scanner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ [API] Dashboard Loaded. Current Stats:", dashRes.data.stats);

    // 5. Simulate Frontend Scanner Verify
    console.log("\n-> Simulating Camera Scanner Verification...");
    const scanRes = await axios.post(`${API_URL}/scanner/verify`, {
      qrCodeId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (scanRes.data.status === 'SUCCESS') {
       console.log(`✅ [API] Gate Scanner returned SUCCESS for ${scanRes.data.attendee.name}`);
    }

    // 6. Wait for the Socket broadcast to hit the "Frontend"
    console.log("\n-> Waiting for Real-Time Dashboard Broadcast...");
    await broadcastPromise;

    console.log("\n🎉 ALL TESTS PASSED! The Frontend is perfectly aligned with the Backend.");

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, error.response.data);
    } else {
      console.error(error.message);
    }
  } finally {
    socket.disconnect();
    process.exit();
  }
}

// Give server 2 seconds to boot before running test
setTimeout(testAlignment, 2000);
