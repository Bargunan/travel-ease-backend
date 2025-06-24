// routes/auth.js - PostgreSQL Compatible Authentication
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');

// User signup
router.post('/signup', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().isLength({ min: 2 }),
    body('age').isInt({ min: 18, max: 100 }),
    body('gender').isIn(['male', 'female', 'other'])
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password, full_name, age, gender, interests } = req.body;

        // Check if user already exists
        let checkQuery, existingUser;
        
        if (process.env.DATABASE_URL) {
            // PostgreSQL
            checkQuery = 'SELECT id FROM users WHERE email = $1';
            const client = await db.connect();
            try {
                const result = await client.query(checkQuery, [email]);
                existingUser = result.rows;
            } finally {
                client.release();
            }
        } else {
            // MySQL
            checkQuery = 'SELECT id FROM users WHERE email = ?';
            const [rows] = await db.execute(checkQuery, [email]);
            existingUser = rows;
        }

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        let insertQuery, insertResult;
        const interestsJson = Array.isArray(interests) ? interests : [];

        if (process.env.DATABASE_URL) {
            // PostgreSQL
            insertQuery = `
                INSERT INTO users (email, password_hash, full_name, age, gender, interests) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, email, full_name, age, gender
            `;
            
            const client = await db.connect();
            try {
                const result = await client.query(insertQuery, [
                    email, password_hash, full_name, age, gender, JSON.stringify(interestsJson)
                ]);
                insertResult = result.rows[0];
            } finally {
                client.release();
            }
        } else {
            // MySQL
            insertQuery = `
                INSERT INTO users (email, password_hash, full_name, age, gender, interests) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(insertQuery, [
                email, password_hash, full_name, age, gender, JSON.stringify(interestsJson)
            ]);
            
            // Get the inserted user
            const [userRows] = await db.execute(
                'SELECT id, email, full_name, age, gender FROM users WHERE id = ?', 
                [result.insertId]
            );
            insertResult = userRows[0];
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: insertResult.id, 
                email: insertResult.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ New user created: ${email}`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
                id: insertResult.id,
                email: insertResult.email,
                full_name: insertResult.full_name,
                age: insertResult.age,
                gender: insertResult.gender
            }
        });

    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// User login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        let query, user;
        
        if (process.env.DATABASE_URL) {
            // PostgreSQL
            query = 'SELECT id, email, password_hash, full_name, age, gender FROM users WHERE email = $1';
            const client = await db.connect();
            try {
                const result = await client.query(query, [email]);
                user = result.rows[0];
            } finally {
                client.release();
            }
        } else {
            // MySQL
            query = 'SELECT id, email, password_hash, full_name, age, gender FROM users WHERE email = ?';
            const [rows] = await db.execute(query, [email]);
            user = rows[0];
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                age: user.age,
                gender: user.gender
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Test route
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Auth route is working!',
        timestamp: new Date().toISOString(),
        database: process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'MySQL (Local)'
    });
});

module.exports = router;
