require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const socketHandler = require('./utils/socketHandler');

// Connect to database only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Trust the proxy (Render reverse proxy) to retrieve correct client IPs for rate-limiting
app.set('trust proxy', 1);

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login requests per windowMs
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io only if not in test env to avoid port conflicts
if (process.env.NODE_ENV !== 'test') {
  socketHandler.init(server);
}

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/api/scanner', require('./routes/scannerRoutes'));

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware (basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Only listen if not imported as a module (allows Supertest to use the app)
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app; // Export app for testing
