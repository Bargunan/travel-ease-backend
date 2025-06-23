const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Reviews working!' });
});

// Create a review
router.post('/', authenticateToken, [
  body('accommodation_id').isInt(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('safety_rating').isInt({ min: 1, max: 5 }),
  body('review_text').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accommodation_id, rating, safety_rating, review_text } = req.body;
    const is_female_review = req.user.gender === 'female';

    // Check if user already reviewed this accommodation
    const [existingReviews] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND accommodation_id = ?',
      [req.user.id, accommodation_id]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this accommodation' });
    }

    const [result] = await db.execute(`
      INSERT INTO reviews (user_id, accommodation_id, rating, safety_rating, review_text, is_female_review)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, accommodation_id, rating, safety_rating, review_text, is_female_review]);

    res.status(201).json({
      message: 'Review created successfully',
      review_id: result.insertId
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reviews for accommodation
router.get('/accommodation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { female_only } = req.query;

    let query = `
      SELECT r.*, u.full_name, u.gender
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.accommodation_id = ?
    `;

    const queryParams = [id];

    if (female_only === 'true') {
      query += ' AND r.is_female_review = 1';
    }

    query += ' ORDER BY r.created_at DESC';

    const [reviews] = await db.execute(query, queryParams);

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;