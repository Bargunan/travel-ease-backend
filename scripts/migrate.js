require('dotenv').config();

// Debug: Show what environment variables are loaded
console.log('🔍 Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'EMPTY/UNDEFINED');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('');

const db = require('../config/database');

const createTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255) NOT NULL,
        gender ENUM('male', 'female', 'other') NOT NULL,
        age INT NOT NULL,
        profile_photo VARCHAR(500),
        interests JSON,
        google_id VARCHAR(255) UNIQUE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Accommodations table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accommodations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        city VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        price_per_night INT NOT NULL,
        accommodation_type ENUM('hostel', 'hotel', 'guesthouse', 'homestay') NOT NULL,
        amenities JSON,
        photos JSON,
        contact_info JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Accommodations table created');

    // Reviews table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        accommodation_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        safety_rating INT NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
        review_text TEXT,
        is_female_review BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Reviews table created');

    // Traveler connections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS traveler_connections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        accommodation_id INT NOT NULL,
        travel_dates JSON NOT NULL,
        is_looking_for_company BOOLEAN DEFAULT TRUE,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Traveler connections table created');

    // Messages table for traveler communication
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Messages table created');

    console.log('🎉 All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

// Run migrations
createTables();