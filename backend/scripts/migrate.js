const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

async function migrate() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database schema applied successfully.');
}

migrate()
    .catch((error) => {
        console.error('Database migration failed:', error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
