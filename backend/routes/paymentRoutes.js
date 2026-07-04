const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get pending payments
router.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, e.full_name as employee_name, e.phone, e.email,
                    emp.company_name as employer_name
             FROM payments p
             JOIN employees e ON p.employee_id = e.id
             LEFT JOIN employers emp ON e.employer_id = emp.id
             WHERE p.status = 'pending'
             ORDER BY p.payment_date DESC`
        );

        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
             FROM payments`
        );

        res.json({
            payments: result.rows,
            stats: stats.rows[0]
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get payment history
router.get('/history', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, e.full_name as employee_name, e.phone, e.email,
                    emp.company_name as employer_name
             FROM payments p
             JOIN employees e ON p.employee_id = e.id
             LEFT JOIN employers emp ON e.employer_id = emp.id
             ORDER BY p.payment_date DESC`
        );

        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
             FROM payments`
        );

        res.json({
            payments: result.rows,
            stats: stats.rows[0]
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
