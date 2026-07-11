const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protectScanner = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.SCANNER_SECRET);

      // Verify the user exists in database (in case they were deleted/revoked)
      // Only do DB validation if database connection is open
      const userExists = await User.findById(decoded.id).select('-password');
      if (!userExists) {
        return res.status(401).json({ message: 'User not found or authorization revoked' });
      }

      // Add scanner info to request object
      req.user = { id: decoded.id, role: decoded.role, username: decoded.username };

      return next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protectScanner };
