const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get summary report
router.get('/summary', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN expiry_date > CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired
             FROM employees`
        );
        res.json({ summary: result.rows[0] });
    } catch (error) {
        console.error('Error getting summary:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get employer report
router.get('/employers', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.id as employer_id,
                e.company_name,
                COUNT(emp.id) as total_employees,
                SUM(CASE WHEN emp.expiry_date > CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN emp.expiry_date >= CURRENT_DATE AND emp.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN emp.expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired
             FROM employers e
             LEFT JOIN employees emp ON e.id = emp.employer_id
             GROUP BY e.id
             ORDER BY e.company_name`
        );
        res.json({ employers: result.rows });
    } catch (error) {
        console.error('Error getting employer report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
