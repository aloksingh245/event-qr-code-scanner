const request = require('supertest');
const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimiter');

describe('Custom Rate Limiter Middleware', () => {
  let app;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    app = express();
    // Temporarily set NODE_ENV to something other than 'test' to run rate limiter checks
    process.env.NODE_ENV = 'development';
  });

  it('should allow requests under the limit and set headers', async () => {
    const limiter = createRateLimiter({
      windowMs: 5000,
      max: 2,
      message: 'Too many requests'
    });

    app.get('/test', limiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    // Request 1: should pass and set limit/remaining headers
    const res1 = await request(app).get('/test');
    expect(res1.statusCode).toBe(200);
    expect(res1.headers['x-ratelimit-limit']).toBe('2');
    expect(res1.headers['x-ratelimit-remaining']).toBe('1');
    expect(res1.headers['x-ratelimit-reset']).toBeDefined();

    // Request 2: should pass and decrement remaining count to 0
    const res2 = await request(app).get('/test');
    expect(res2.statusCode).toBe(200);
    expect(res2.headers['x-ratelimit-remaining']).toBe('0');

    // Request 3: exceeds limit, should return 429
    const res3 = await request(app).get('/test');
    expect(res3.statusCode).toBe(429);
    expect(res3.body.message).toBe('Too many requests');
  });

  it('should bypass limiting when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';

    const limiter = createRateLimiter({
      windowMs: 5000,
      max: 1,
      message: 'Too many requests'
    });

    app.get('/test', limiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    // All requests should succeed because NODE_ENV === 'test' bypasses limits
    const res1 = await request(app).get('/test');
    const res2 = await request(app).get('/test');
    const res3 = await request(app).get('/test');

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    expect(res3.statusCode).toBe(200);
  });
});
