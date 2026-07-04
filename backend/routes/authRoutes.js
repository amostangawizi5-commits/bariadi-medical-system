const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const router = express.Router();

const sanitizeUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    profile_image: user.profile_image,
    role: user.role
});

const ensureUserProfileColumns = async () => {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT');
    } catch (error) {
        if (error.code === '42501') {
            console.warn('Skipping users.profile_image schema check because database user lacks ALTER permission.');
            return;
        }

        throw error;
    }
};

const getUserByEmail = async (email) => {
    try {
        return await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
    } catch (error) {
        if (error.code !== '42703') {
            throw error;
        }

        return pool.query(
            `SELECT id, username, email, password_hash, full_name, phone, role
             FROM users
             WHERE email = $1`,
            [email]
        );
    }
};

const getCurrentUserById = async (id) => {
    try {
        return await pool.query(
            'SELECT id, username, email, full_name, phone, profile_image, role FROM users WHERE id = $1',
            [id]
        );
    } catch (error) {
        if (error.code !== '42703') {
            throw error;
        }

        return pool.query(
            'SELECT id, username, email, full_name, phone, role FROM users WHERE id = $1',
            [id]
        );
    }
};

const generateUsername = async (firstName, lastName) => {
    const base = `${firstName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${lastName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'user';

    let username = base;
    let suffix = 1;

    while (true) {
        const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return username;
        }
        username = `${base}${suffix}`;
        suffix += 1;
    }
};

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2');

const verifyPassword = async (password, storedPassword) => {
    if (isBcryptHash(storedPassword)) {
        return bcrypt.compare(password, storedPassword);
    }

    // Backward compatibility for the seed admin account in schema.sql.
    return password === storedPassword;
};

// Register
router.post('/register', async (req, res) => {
    try {
        await ensureUserProfileColumns();
        const { first_name, last_name, email, password, phone } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();
        const username = await generateUsername(first_name, last_name);

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, full_name, phone, role)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, username, email, full_name, phone, profile_image, role`,
            [username, normalizedEmail, passwordHash, fullName, phone || null, 'admin']
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user by email
        const result = await getUserByEmail(email.trim().toLowerCase());

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const passwordMatches = await verifyPassword(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: sanitizeUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await getCurrentUserById(decoded.id);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Update current user profile
router.put('/profile', async (req, res) => {
    try {
        await ensureUserProfileColumns();
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { username, full_name, email, phone, profile_image, current_password, new_password } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        if (!full_name) {
            return res.status(400).json({ message: 'Full name is required' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        if (profile_image && (!String(profile_image).startsWith('data:image/') || String(profile_image).length > 1500000)) {
            return res.status(400).json({ message: 'Profile image must be a valid image under 1.5MB' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedFullName = full_name.trim();
        const usernameChanged = normalizedUsername !== String(user.username || '').trim();
        const emailChanged = normalizedEmail !== String(user.email || '').trim().toLowerCase();
        const passwordChangeRequested = Boolean(new_password && new_password.trim() !== '');

        if (usernameChanged || emailChanged || passwordChangeRequested) {
            if (!current_password) {
                return res.status(400).json({ message: 'Current password is required to change profile' });
            }

            const passwordMatches = await verifyPassword(current_password, user.password_hash);
            if (!passwordMatches) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        if (usernameChanged) {
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id <> $2',
                [normalizedUsername, user.id]
            );
            if (existingUser.rows.length > 0) {
                return res.status(409).json({ message: 'Username already in use' });
            }
        }

        if (emailChanged) {
            const existingEmail = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id <> $2',
                [normalizedEmail, user.id]
            );
            if (existingEmail.rows.length > 0) {
                return res.status(409).json({ message: 'Email already in use' });
            }
        }

        let passwordHash = user.password_hash;
        if (passwordChangeRequested) {
            if (new_password.length < 8) {
                return res.status(400).json({ message: 'Password must be at least 8 characters' });
            }
            passwordHash = await bcrypt.hash(new_password, 10);
        }

        let updatedResult;
        try {
            updatedResult = await pool.query(
                `UPDATE users
                 SET username = $1,
                     email = $2,
                     full_name = $3,
                     phone = $4,
                     profile_image = $5,
                     password_hash = $6
                 WHERE id = $7
                 RETURNING id, username, email, full_name, phone, profile_image, role`,
                [normalizedUsername, normalizedEmail, normalizedFullName, phone || null, profile_image || null, passwordHash, user.id]
            );
        } catch (error) {
            if (error.code !== '42703') {
                throw error;
            }

            updatedResult = await pool.query(
                `UPDATE users
                 SET username = $1,
                     email = $2,
                     full_name = $3,
                     phone = $4,
                     password_hash = $5
                 WHERE id = $6
                 RETURNING id, username, email, full_name, phone, role`,
                [normalizedUsername, normalizedEmail, normalizedFullName, phone || null, passwordHash, user.id]
            );
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
