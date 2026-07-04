const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : undefined
    }
    : {
        user: process.env.DB_USER || 'medical_admin',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'medical_certificates',
        password: process.env.DB_PASSWORD || 'Medical@2026',
        port: process.env.DB_PORT || 5432
    };

const pool = new Pool({
    ...poolConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error(' Error connecting to database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

module.exports = pool;
