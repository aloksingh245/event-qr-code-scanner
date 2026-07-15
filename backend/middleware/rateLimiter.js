const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  // Periodic cleanup of expired entries to prevent memory leaks
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60000));

  // Unref the timer so it doesn't block process termination or keep tests hanging
  if (timer.unref) {
    timer.unref();
  }

  return (req, res, next) => {
    // Bypass rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Retrieve IP address from request headers or remote socket
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    let record = hits.get(ip);

    // If no record exists or the current window has expired, reset/initialize
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(ip, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    
    // Set standard rate limiting headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    // Block if limit exceeded
    if (record.count > max) {
      return res.status(429).json({
        message: message || 'Too many requests. Please try again later.'
      });
    }

    next();
  };
};

// Limiter to prevent email spamming on registration or OTP requests
const registrationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: 'Too many registration or OTP requests. Please try again after 5 minutes.'
});

// Limiter to prevent brute-forcing OTP values
const otpVerifyLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many verification attempts. Please try again after 5 minutes.'
});

module.exports = {
  createRateLimiter,
  registrationLimiter,
  otpVerifyLimiter
};
