// server.js - Main Server with Auto-Migration
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auto-migration function for PostgreSQL
async function runAutoMigration() {
    if (!process.env.DATABASE_URL) {
        console.log('⏭️ Skipping auto-migration (local development - using MySQL)');
        return;
    }
    
    try {
        console.log('🚀 Running PostgreSQL auto-migration...');
        
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                full_name VARCHAR(255) NOT NULL,
                gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
                age INTEGER NOT NULL,
                profile_photo VARCHAR(500),
                interests JSONB,
                google_id VARCHAR(255) UNIQUE,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');

        // Create accommodations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accommodations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                city VARCHAR(100) NOT NULL,
                address TEXT NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                price_per_night INTEGER NOT NULL,
                accommodation_type VARCHAR(50) NOT NULL CHECK (accommodation_type IN ('hostel', 'hotel', 'guesthouse', 'homestay')),
                amenities JSONB,
                photos JSONB,
                contact_info JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Accommodations table ready');

        // Create reviews table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                accommodation_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                safety_rating INTEGER NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
                review_text TEXT,
                is_female_review BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Reviews table ready');

        // Create traveler_connections table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS traveler_connections (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                accommodation_id INTEGER NOT NULL,
                travel_dates JSONB NOT NULL,
                is_looking_for_company BOOLEAN DEFAULT TRUE,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Traveler connections table ready');

        // Create messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Messages table ready');

        // Insert sample accommodations if database is empty
        const result = await pool.query('SELECT COUNT(*) FROM accommodations');
        if (parseInt(result.rows[0].count) === 0) {
            console.log('📦 Inserting sample accommodations...');
            
            await pool.query(`
                INSERT INTO accommodations (name, description, city, address, price_per_night, accommodation_type, amenities, photos, is_active) VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9),
                ($10, $11, $12, $13, $14, $15, $16, $17, $18),
                ($19, $20, $21, $22, $23, $24, $25, $26, $27)
            `, [
                'Cozy Central Hostel', 'A safe and clean hostel in the heart of the city with 24/7 security and female-only dorms available.', 'Bangalore', 'MG Road, Bangalore, Karnataka 560001', 2500, 'hostel', JSON.stringify(["WiFi", "24/7 Security", "Shared Kitchen", "Common Area"]), JSON.stringify([]), true,
                'Backpacker Paradise', 'Budget-friendly hostel with a great kitchen and social atmosphere for meeting fellow travelers.', 'Pune', 'Koregaon Park, Pune, Maharashtra 411001', 1800, 'hostel', JSON.stringify(["WiFi", "Kitchen", "Common Room", "Lockers"]), JSON.stringify([]), true,
                'Urban Nomad Hub', 'Premium accommodation perfect for digital nomads and business travelers seeking comfort and connectivity.', 'Mumbai', 'Bandra West, Mumbai, Maharashtra 400050', 3200, 'hotel', JSON.stringify(["High-Speed WiFi", "Workspace", "Gym", "Restaurant"]), JSON.stringify([]), true
            ]);
            
            console.log('✅ Sample accommodations inserted');
        } else {
            console.log('ℹ️ Accommodations already exist, skipping sample data');
        }
        
        await pool.end();
        console.log('🎉 PostgreSQL auto-migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Auto-migration failed:', error);
        console.log('⚠️ Server will continue without migration...');
    }
}

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'TravelEase API is running',
        timestamp: new Date().toISOString(),
        database: process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'MySQL (Local)',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Import route handlers
const authRoutes = require('./routes/auth');
const accommodationRoutes = require('./routes/accommodations');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const travelerRoutes = require('./routes/travelers');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/travelers', travelerRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server with auto-migration
async function startServer() {
    try {
        // Run auto-migration for PostgreSQL
        await runAutoMigration();
        
        // Start the server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 TravelEase API server running on port ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'MySQL (Local)'}`);
            
            if (process.env.DATABASE_URL) {
                console.log('🔗 Health Check: https://travel-ease-backend-l1wr.onrender.com/api/health');
                console.log('🔍 Search Test: https://travel-ease-backend-l1wr.onrender.com/api/accommodations/search');
            } else {
                console.log('🔗 Local Health Check: http://localhost:3000/api/health');
                console.log('🔍 Local Search Test: http://localhost:3000/api/accommodations/search');
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
