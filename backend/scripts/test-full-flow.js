const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

const API_URL = 'http://localhost:5001/api';
const TEST_EMAIL = `aloksinghrajput2405+liveqr_${Date.now()}@gmail.com`; 

async function sendFreshQRToEmail() {
  console.log("=========================================");
  console.log("📨 SENDING FRESH SCANNABLE QR CODE TO EMAIL");
  console.log("=========================================\n");

  try {
    // Register User (Triggers OTP Email)
    console.log(`-> 📝 Registering new user: ${TEST_EMAIL}...`);
    const regRes = await axios.post(`${API_URL}/registrations`, {
      name: 'Alok Live Scanner Test',
      email: TEST_EMAIL
    });

    console.log(`✅ Registration Step 1 Success!`);
    console.log(`📧 DING! A verification code OTP has been sent to your email.`);
    console.log(`👉 Step 2: Query the DB to find the OTP, verify it, and get your ticket.`);

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

sendFreshQRToEmail();
