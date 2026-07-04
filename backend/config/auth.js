const crypto = require('crypto');

const generatedJwtSecret = crypto.randomBytes(48).toString('hex');

if (!process.env.JWT_SECRET) {
    console.warn(
        'JWT_SECRET is not set. Using a temporary in-memory secret; set JWT_SECRET in Render for stable login sessions.'
    );
}

const jwtSecret = process.env.JWT_SECRET || generatedJwtSecret;

module.exports = {
    jwtSecret
};
