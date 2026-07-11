const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Start MongoDB Memory Server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

// Clear all collections after each test so state is fresh
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Disconnect and stop memory server after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global Mocks
jest.mock('../services/mailService', () => ({
  sendQREmail: jest.fn().mockResolvedValue(true) // Mock email to prevent actual sending during tests
}));

jest.mock('../services/qrService', () => ({
  generateQR: jest.fn().mockResolvedValue('mock-base64-image-string')
}));
