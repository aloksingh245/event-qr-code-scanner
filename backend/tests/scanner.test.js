const request = require('supertest');
const app = require('../server');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const jwt = require('jsonwebtoken');

describe('Scanner API - Concurrency & Edge Cases', () => {
  const testEventId = 'EVT-TEST-SCAN';
  let scannerToken;
  let testUserQR;

  beforeAll(() => {
    // Setup JWT Secret for testing
    process.env.SCANNER_SECRET = 'test_secret_key';
    scannerToken = jwt.sign({ id: 'SCANNER_01', role: 'scanner' }, process.env.SCANNER_SECRET);
  });

  beforeEach(async () => {
    await Event.create({
      eventId: testEventId,
      eventName: 'Scan Fest',
      eventDate: new Date(),
      location: 'Stadium',
      organizerId: 'ORG01',
      capacity: 100,
      registeredCount: 1
    });

    const reg = await Registration.create({
      eventId: testEventId,
      name: 'Bob',
      email: 'bob@example.com',
      contact: '123',
      qrCodeId: 'test-uuid-v4-bob'
    });
    testUserQR = reg.qrCodeId;
  });

  it('1. Should deny access without valid JWT', async () => {
    const res = await request(app)
      .post('/api/scanner/verify')
      .send({ qrCodeId: testUserQR, gateId: 'Gate 1' });
    
    expect(res.statusCode).toEqual(401);
  });

  it('2. Should successfully scan a valid QR code', async () => {
    const res = await request(app)
      .post('/api/scanner/verify')
      .set('Authorization', `Bearer ${scannerToken}`)
      .send({ qrCodeId: testUserQR, gateId: 'Gate 1' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('SUCCESS');

    // Verify DB update
    const reg = await Registration.findOne({ qrCodeId: testUserQR });
    expect(reg.scanned).toBe(true);
    expect(reg.gateId).toBe('Gate 1');
    expect(reg.scannerId).toBe('SCANNER_01');
  });

  it('3. Should block a cancelled ticket', async () => {
    // Cancel the ticket first
    await Registration.findOneAndUpdate({ qrCodeId: testUserQR }, { status: 'CANCELLED' });

    const res = await request(app)
      .post('/api/scanner/verify')
      .set('Authorization', `Bearer ${scannerToken}`)
      .send({ qrCodeId: testUserQR, gateId: 'Gate 1' });

    expect(res.statusCode).toEqual(403);
    expect(res.body.status).toBe('CANCELLED_TICKET');
  });

  it('4. DOUBLE SCAN RACE CONDITION TEST: Should strictly prevent concurrent double entries', async () => {
    // Imagine the user took a screenshot and 10 friends try to scan it at 10 different gates 
    // at the EXACT same millisecond.
    const requests = Array.from({ length: 10 }).map((_, i) => {
      return request(app)
        .post('/api/scanner/verify')
        .set('Authorization', `Bearer ${scannerToken}`)
        .send({ qrCodeId: testUserQR, gateId: `Gate ${i}` });
    });

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(r => r.statusCode === 200 && r.body.status === 'SUCCESS');
    const conflictResponses = responses.filter(r => r.statusCode === 409 && r.body.status === 'ALREADY_SCANNED');

    // Assert EXACTLY 1 succeeded and 9 got 'ALREADY_SCANNED'
    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(9);

    // Verify DB state is exactly scanned: true
    const reg = await Registration.findOne({ qrCodeId: testUserQR });
    expect(reg.scanned).toBe(true);
  });
});
