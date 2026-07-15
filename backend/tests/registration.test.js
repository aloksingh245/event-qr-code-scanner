const request = require('supertest');
const app = require('../server');
const Registration = require('../models/Registration');

describe('Registration API - Concurrency & Edge Cases', () => {
  beforeEach(() => {
    process.env.EVENT_CAPACITY = '5'; // VERY LOW CAPACITY to test race conditions
  });

  it('1. Should register a user successfully', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .send({
        name: 'John Doe',
        email: 'john@example.com'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);

    // Verify DB states
    const reg = await Registration.findOne({ email: 'john@example.com' });
    expect(reg).toBeTruthy();
    expect(reg.status).toEqual('PENDING_VERIFICATION');
  });

  it('2. Should prevent duplicate registration for the same event', async () => {
    // First registration
    await request(app).post('/api/registrations').send({
      name: 'Alice', email: 'alice@example.com'
    });

    // Mark registration as VALID to trigger duplicate blocking (since PENDING registrations get OTP resend)
    await Registration.findOneAndUpdate({ email: 'alice@example.com' }, { status: 'VALID' });

    // Duplicate attempt
    const res = await request(app).post('/api/registrations').send({
      name: 'Alice 2', email: 'alice@example.com'
    });

    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('3. TOCTOU RACE CONDITION TEST: Should strictly enforce capacity limit under heavy concurrent load', async () => {
    // Capacity is 5. Let's fire 20 requests EXACTLY at the same time.
    const requests = Array.from({ length: 20 }).map((_, i) => {
      return request(app).post('/api/registrations').send({
        name: `User ${i}`,
        email: `user${i}@example.com`
      });
    });

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(r => r.statusCode === 201);
    const failureResponses = responses.filter(r => r.statusCode === 400);

    // Assert exactly 5 succeeded and 15 failed due to full capacity
    expect(successResponses.length).toBe(5);
    expect(failureResponses.length).toBe(15);

    // Verify Database state is absolutely correct
    const registrationsCount = await Registration.countDocuments({ status: { $ne: 'CANCELLED' } });
    expect(registrationsCount).toBe(5);
  });
});
