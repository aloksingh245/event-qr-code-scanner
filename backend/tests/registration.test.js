const request = require('supertest');
const app = require('../server');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

describe('Registration API - Concurrency & Edge Cases', () => {
  const testEventId = 'EVT-TEST-1';

  beforeEach(async () => {
    // Seed an event for testing
    await Event.create({
      eventId: testEventId,
      eventName: 'Test Concert',
      eventDate: new Date(),
      location: 'Stadium',
      organizerId: 'ORG01',
      capacity: 5 // VERY LOW CAPACITY to test race conditions
    });
  });

  it('1. Should register a user successfully', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .send({
        eventId: testEventId,
        name: 'John Doe',
        email: 'john@example.com',
        contact: '1234567890'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.qrCodeId).toBeDefined();

    // Verify DB states
    const event = await Event.findOne({ eventId: testEventId });
    expect(event.registeredCount).toBe(1);

    const reg = await Registration.findOne({ email: 'john@example.com' });
    expect(reg).toBeTruthy();
    expect(reg.qrCodeId).toEqual(res.body.qrCodeId);
  });

  it('2. Should prevent duplicate registration for the same event', async () => {
    // First registration
    await request(app).post('/api/registrations').send({
      eventId: testEventId, name: 'Alice', email: 'alice@example.com', contact: '111'
    });

    // Duplicate attempt
    const res = await request(app).post('/api/registrations').send({
      eventId: testEventId, name: 'Alice 2', email: 'alice@example.com', contact: '222'
    });

    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toMatch(/already registered/i);

    const event = await Event.findOne({ eventId: testEventId });
    expect(event.registeredCount).toBe(1); // Ensure count wasn't inflated
  });

  it('3. TOCTOU RACE CONDITION TEST: Should strictly enforce capacity limit under heavy concurrent load', async () => {
    // Capacity is 5. Let's fire 20 requests EXACTLY at the same time.
    const requests = Array.from({ length: 20 }).map((_, i) => {
      return request(app).post('/api/registrations').send({
        eventId: testEventId,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        contact: '1234567890'
      });
    });

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(r => r.statusCode === 201);
    const failureResponses = responses.filter(r => r.statusCode === 400);

    // Assert exactly 5 succeeded and 15 failed due to full capacity
    expect(successResponses.length).toBe(5);
    expect(failureResponses.length).toBe(15);

    // Verify Database state is absolutely correct
    const event = await Event.findOne({ eventId: testEventId });
    expect(event.registeredCount).toBe(5);

    const registrations = await Registration.countDocuments({ eventId: testEventId });
    expect(registrations).toBe(5);
  });
});
