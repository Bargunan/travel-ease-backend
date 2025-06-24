// scripts/migrate.js - PostgreSQL Migration Script
require('dotenv').config();
const { Pool } = require('pg');

async function createTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🚀 Starting database migration...');

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
        console.log('✅ Users table created');

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
        console.log('✅ Accommodations table created');

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
        console.log('✅ Reviews table created');

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
        console.log('✅ Traveler connections table created');

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
        console.log('✅ Messages table created');

        // Insert sample accommodations
        const existingAccommodations = await pool.query('SELECT COUNT(*) FROM accommodations');
        if (existingAccommodations.rows[0].count == 0) {
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
        }

        console.log('🎉 Database migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    createTables()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = createTables;
