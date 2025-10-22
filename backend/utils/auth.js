const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate session token for chatbot
const generateSessionToken = () => {
  return uuidv4();
};

// Generate short-lived access token for chatbot API
const generateChatbotToken = (userId, sessionId) => {
  const payload = {
    userId,
    sessionId,
    type: 'chatbot_access',
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Short-lived token (1 hour)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateSessionToken,
  generateChatbotToken
};
