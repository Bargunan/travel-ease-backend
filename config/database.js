const mysql = require('mysql2');

// Temporarily hardcoded values for testing
const dbConfig = {
  host: 'localhost',
  user: 'travelease_user',
  password: 'travelease123',
  database: 'travelease',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Current config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password ? '***hidden***' : 'EMPTY',
      database: dbConfig.database
    });
  }
};

testConnection();

module.exports = promisePool;