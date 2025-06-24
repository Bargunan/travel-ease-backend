// config/database.js - Universal Database Configuration
require('dotenv').config();

let dbConfig;

if (process.env.DATABASE_URL) {
    // PostgreSQL configuration for Render
    console.log('🐘 Using PostgreSQL database (Render)');
    
    const { Pool } = require('pg');
    
    dbConfig = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Test PostgreSQL connection
    dbConfig.connect()
        .then(client => {
            console.log('✅ Connected to PostgreSQL database successfully');
            client.release();
        })
        .catch(err => {
            console.error('❌ PostgreSQL connection error:', err.message);
        });

} else {
    // MySQL configuration for local development
    console.log('🐬 Using MySQL database (Local)');
    
    const mysql = require('mysql2/promise');
    
    dbConfig = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'travelease_user',
        password: process.env.DB_PASSWORD || 'travelease123',
        database: process.env.DB_NAME || 'travelease',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    // Test MySQL connection
    dbConfig.getConnection()
        .then(connection => {
            console.log('✅ Connected to MySQL database successfully');
            connection.release();
        })
        .catch(err => {
            console.error('❌ MySQL connection error:', err.message);
        });
}

module.exports = dbConfig;
