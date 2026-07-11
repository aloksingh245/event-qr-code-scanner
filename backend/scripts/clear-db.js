require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Registration = require('../models/Registration');

async function clearDatabase() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Delete all registrations
    const regResult = await Registration.deleteMany({});
    console.log(`✅ Deleted ${regResult.deletedCount} registration documents.`);

    console.log('\n🎉 Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  }
}

clearDatabase();
