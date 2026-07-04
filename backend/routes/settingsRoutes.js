const express = require('express');
const pool = require('../config/database');
const router = express.Router();

const defaultSettings = {
    sms_30_days: {
        value: 'true',
        description: 'Send SMS 30 days before expiry'
    },
    sms_14_days: {
        value: 'true',
        description: 'Send SMS 14 days before expiry'
    },
    sms_7_days: {
        value: 'true',
        description: 'Send SMS 7 days before expiry'
    },
    sms_expired: {
        value: 'true',
        description: 'Send SMS on expiry day'
    },
    sms_overdue: {
        value: 'true',
        description: 'Send SMS 7 days after expiry'
    },
    certificate_validity: {
        value: '6',
        description: 'Certificate validity in months'
    }
};

const ensureSettingsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(50) UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await Promise.all(
        Object.entries(defaultSettings).map(([key, setting]) => pool.query(
            `INSERT INTO system_settings (setting_key, setting_value, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (setting_key) DO NOTHING`,
            [key, setting.value, setting.description]
        ))
    );
};

const normalizeSettings = (rows) => rows.reduce((settings, row) => ({
    ...settings,
    [row.setting_key]: row.setting_value
}), {});

router.get('/', async (req, res) => {
    try {
        await ensureSettingsTable();
        const result = await pool.query(
            'SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key'
        );

        res.json({
            success: true,
            settings: normalizeSettings(result.rows)
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/', async (req, res) => {
    try {
        await ensureSettingsTable();

        const nextSettings = {
            sms_30_days: String(Boolean(req.body.sms_30_days)),
            sms_14_days: String(Boolean(req.body.sms_14_days)),
            sms_7_days: String(Boolean(req.body.sms_7_days)),
            sms_expired: String(Boolean(req.body.sms_expired)),
            sms_overdue: String(Boolean(req.body.sms_overdue)),
            certificate_validity: String(Math.max(1, Number(req.body.certificate_validity) || 6))
        };

        await Promise.all(
            Object.entries(nextSettings).map(([key, value]) => pool.query(
                `UPDATE system_settings
                 SET setting_value = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE setting_key = $2`,
                [value, key]
            ))
        );

        res.json({
            success: true,
            message: 'Settings saved successfully',
            settings: nextSettings
        });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
