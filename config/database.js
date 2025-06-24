// config/database.js - Updated for Render PostgreSQL + Local MySQL
require('dotenv').config();

let dbConfig;

if (process.env.DATABASE_URL) {
    // PostgreSQL configuration for Render deployment
    console.log('🐘 Using PostgreSQL database (Render)');
    
    const { Pool } = require('pg');
    
    dbConfig = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10, // Maximum number of connections
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
        acquireTimeout: 60000,
        timeout: 60000,
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

// Universal query function that works with both PostgreSQL and MySQL
dbConfig.query = async function(sql, params = []) {
    try {
        if (process.env.DATABASE_URL) {
            // PostgreSQL query
            const client = await this.connect();
            try {
                const result = await client.query(sql, params);
                return result.rows;
            } finally {
                client.release();
            }
        } else {
            // MySQL query
            const [rows] = await this.execute(sql, params);
            return rows;
        }
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

module.exports = dbConfig;
