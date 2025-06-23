const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Travelers working!' });
});

// Create traveler connection
router.post('/connect', authenticateToken, [
  body('accommodation_id').isInt(),
  body('travel_dates').isObject(),
  body('message').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accommodation_id, travel_dates, message } = req.body;

    const [result] = await db.execute(`
      INSERT INTO traveler_connections (user_id, accommodation_id, travel_dates, message)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, accommodation_id, JSON.stringify(travel_dates), message]);

    res.status(201).json({
      message: 'Traveler connection created successfully',
      connection_id: result.insertId
    });
  } catch (error) {
    console.error('Create connection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get travelers for accommodation
router.get('/accommodation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkin, checkout } = req.query;

    let query = `
      SELECT tc.*, u.full_name, u.gender, u.age, u.interests
      FROM traveler_connections tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.accommodation_id = ? AND tc.is_looking_for_company = 1
    `;

    const queryParams = [id];

    if (checkin && checkout) {
      query += ` 
        AND JSON_EXTRACT(tc.travel_dates, '$.checkin') <= ?
        AND JSON_EXTRACT(tc.travel_dates, '$.checkout') >= ?
      `;
      queryParams.push(checkout, checkin);
    }

    query += ' ORDER BY tc.created_at DESC LIMIT 10';

    const [travelers] = await db.execute(query, queryParams);

    // Safe JSON parsing for each traveler
    travelers.forEach(traveler => {
      // Parse interests safely
      try {
        traveler.interests = traveler.interests ? JSON.parse(traveler.interests) : [];
      } catch (e) {
        console.warn('Invalid interests JSON for user', traveler.user_id, ':', traveler.interests);
        traveler.interests = [];
      }

      // Parse travel_dates safely
      try {
        traveler.travel_dates = traveler.travel_dates ? JSON.parse(traveler.travel_dates) : {};
      } catch (e) {
        console.warn('Invalid travel_dates JSON for connection', traveler.id, ':', traveler.travel_dates);
        traveler.travel_dates = {};
      }
    });

    res.json(travelers);
  } catch (error) {
    console.error('Get travelers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send message to traveler
router.post('/message', authenticateToken, [
  body('receiver_id').isInt(),
  body('message').isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiver_id, message } = req.body;

    const [result] = await db.execute(`
      INSERT INTO messages (sender_id, receiver_id, message)
      VALUES (?, ?, ?)
    `, [req.user.id, receiver_id, message]);

    res.status(201).json({
      message: 'Message sent successfully',
      message_id: result.insertId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;