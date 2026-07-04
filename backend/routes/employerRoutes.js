const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all employers
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, COUNT(emp.id) as employee_count 
             FROM employers e
             LEFT JOIN employees emp ON e.id = emp.employer_id
             GROUP BY e.id
             ORDER BY e.company_name`
        );
        res.json({ employers: result.rows });
    } catch (error) {
        console.error('Error fetching employers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single employer with employees
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM employers WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employer not found' });
        }

        const employees = await pool.query(
            `SELECT * FROM employees WHERE employer_id = $1`,
            [id]
        );

        res.json({ 
            employer: result.rows[0],
            employees: employees.rows 
        });
    } catch (error) {
        console.error('Error fetching employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create employer
router.post('/', async (req, res) => {
    try {
        const { company_name, registration_number, address, contact_person, contact_phone } = req.body;

        const result = await pool.query(
            `INSERT INTO employers (company_name, registration_number, address, contact_person, contact_phone)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [company_name, registration_number, address, contact_person, contact_phone]
        );

        res.status(201).json({
            success: true,
            message: 'Employer added successfully',
            employer: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating employer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
