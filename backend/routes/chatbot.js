const express = require('express');
const { validateToken } = require('../middleware/auth');
const { validateChatMessage } = require('../middleware/validation');
const { generateSessionToken, generateChatbotToken } = require('../utils/auth');
const { query } = require('../config/database');
const axios = require('axios');

const router = express.Router();

// Generate chatbot session token
router.post('/token', validateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const sessionToken = generateSessionToken();
    
    // Create chat session
    const result = await query(
      `INSERT INTO chat_sessions (user_id, session_token, status)
       VALUES ($1, $2, 'active')
       RETURNING id, session_token, created_at, expires_at`,
      [userId, sessionToken]
    );

    const session = result.rows[0];
    
    // Generate short-lived access token for chatbot API
    const chatbotToken = generateChatbotToken(userId, session.id);

    res.json({
      sessionToken: session.session_token,
      chatbotToken,
      expiresAt: session.expires_at,
      message: 'Chatbot session created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Send message to chatbot
router.post('/message', validateChatMessage, async (req, res, next) => {
  try {
    const { message, sessionToken } = req.body;

    // Verify session exists and is active
    const sessionResult = await query(
      `SELECT cs.id, cs.user_id, cs.status, cs.expires_at, u.email, u.first_name, u.last_name
       FROM chat_sessions cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.session_token = $1`,
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Chat session is not active' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Chat session has expired' });
    }

    // Store user message
    await query(
      `INSERT INTO chat_messages (session_id, message_type, content)
       VALUES ($1, 'user', $2)`,
      [session.id, message]
    );

    // Forward message to Python chatbot service
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      const chatbotResponse = await axios.post(`${pythonServiceUrl}/chat`, {
        message,
        sessionId: session.id,
        userId: session.user_id,
        userInfo: {
          email: session.email,
          firstName: session.first_name,
          lastName: session.last_name
        }
      }, {
        timeout: 30000 // 30 second timeout
      });

      const botMessage = chatbotResponse.data.message;

      // Store bot response
      await query(
        `INSERT INTO chat_messages (session_id, message_type, content, metadata)
         VALUES ($1, 'bot', $2, $3)`,
        [session.id, botMessage, JSON.stringify(chatbotResponse.data.metadata || {})]
      );

      res.json({
        message: botMessage,
        metadata: chatbotResponse.data.metadata || {},
        sessionToken
      });

    } catch (pythonError) {
      console.error('Python service error:', pythonError.message);
      
      // Store error message
      const errorMessage = 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.';
      await query(
        `INSERT INTO chat_messages (session_id, message_type, content, metadata)
         VALUES ($1, 'bot', $2, $3)`,
        [session.id, errorMessage, JSON.stringify({ error: 'service_unavailable' })]
      );

      res.json({
        message: errorMessage,
        metadata: { error: 'service_unavailable' },
        sessionToken
      });
    }

  } catch (error) {
    next(error);
  }
});

// Get chat history
router.get('/history/:sessionToken', validateToken, async (req, res, next) => {
  try {
    const { sessionToken } = req.params;
    const userId = req.user.userId;

    // Verify session belongs to user
    const sessionResult = await query(
      'SELECT id FROM chat_sessions WHERE session_token = $1 AND user_id = $2',
      [sessionToken, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const sessionId = sessionResult.rows[0].id;

    // Get chat messages
    const messagesResult = await query(
      `SELECT message_type, content, metadata, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      messages: messagesResult.rows.map(msg => ({
        type: msg.message_type,
        content: msg.content,
        metadata: msg.metadata,
        timestamp: msg.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// End chat session
router.post('/end-session', validateToken, async (req, res, next) => {
  try {
    const { sessionToken } = req.body;
    const userId = req.user.userId;

    // Update session status
    const result = await query(
      `UPDATE chat_sessions 
       SET status = 'completed'
       WHERE session_token = $1 AND user_id = $2
       RETURNING id`,
      [sessionToken, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ message: 'Chat session ended successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
