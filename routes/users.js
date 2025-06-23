const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Users working!' });
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, email, full_name, gender, age, profile_photo, interests, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    
    // Safe JSON parsing for interests
    try {
      user.interests = user.interests ? JSON.parse(user.interests) : [];
    } catch (e) {
      console.warn('Invalid interests JSON for user', user.id, ':', user.interests);
      user.interests = [];
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('full_name').optional().isLength({ min: 2 }),
  body('interests').optional().isArray(),
  body('profile_photo').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, interests, profile_photo } = req.body;

    await db.execute(
      'UPDATE users SET full_name = ?, interests = ?, profile_photo = ? WHERE id = ?',
      [full_name, JSON.stringify(interests || []), profile_photo, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's reviews
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const [reviews] = await db.execute(`
      SELECT r.*, a.name as accommodation_name, a.city
      FROM reviews r
      JOIN accommodations a ON r.accommodation_id = a.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(reviews);
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's traveler connections
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const [connections] = await db.execute(`
      SELECT tc.*, a.name as accommodation_name, a.city
      FROM traveler_connections tc
      JOIN accommodations a ON tc.accommodation_id = a.id
      WHERE tc.user_id = ?
      ORDER BY tc.created_at DESC
    `, [req.user.id]);

    // Safe JSON parsing for travel_dates in each connection
    connections.forEach(connection => {
      try {
        connection.travel_dates = connection.travel_dates ? JSON.parse(connection.travel_dates) : {};
      } catch (e) {
        console.warn('Invalid travel_dates JSON for connection', connection.id, ':', connection.travel_dates);
        connection.travel_dates = {};
      }
    });

    res.json(connections);
  } catch (error) {
    console.error('Get user connections error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;