const express = require('express');
const cors = require('cors'); // Make sure this is imported
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - ADD THIS SECTION RIGHT HERE!
app.use(cors({
    origin: [
        'http://localhost:8080',    // Your frontend server
        'http://127.0.0.1:8080',    // Alternative localhost
        'http://localhost:3000'     // In case frontend is on same port
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Existing middleware (keep these as they are)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware (keep these)
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint - MAKE SURE THIS EXISTS
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'TravelEase API is running',
        timestamp: new Date().toISOString()
    });
});

// Your existing routes (keep these as they are)
const authRoutes = require('./routes/auth');
const accommodationRoutes = require('./routes/accommodations');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const travelerRoutes = require('./routes/travelers');

app.use('/api/auth', authRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/travelers', travelerRoutes);

// Error handling middleware (keep this)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// 404 handler (keep this)
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});