const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const { sendSms } = require('../services/smsService');
const router = express.Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const MAX_RECEIPT_UPLOAD_BYTES = 5 * 1024 * 1024;
const RECEIPT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
const RECEIPT_EXTENSIONS = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};
let receiptUploadColumnReady = false;

const getTestValidityMinutes = () => {
    const minutes = Number(process.env.CERTIFICATE_VALIDITY_MINUTES);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const getCertificateValidityMonths = async () => {
    try {
        const result = await pool.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'certificate_validity' LIMIT 1"
        );
        const months = Number(result.rows[0]?.setting_value);
        return Number.isFinite(months) && months > 0 ? months : 6;
    } catch (error) {
        if (error.code !== '42P01') {
            console.warn('Could not read certificate validity setting:', error.message);
        }
        return 6;
    }
};

const getCertificateInfo = (employeeOrExpiryDate) => {
    const testValidityMinutes = getTestValidityMinutes();

    if (testValidityMinutes && typeof employeeOrExpiryDate === 'object') {
        const employee = employeeOrExpiryDate;
        const startDate = new Date(employee.updated_at || employee.created_at || employee.exam_date || Date.now());
        const expiry = new Date(startDate.getTime() + testValidityMinutes * MS_PER_MINUTE);
        const now = new Date();
        const msUntilExpiry = expiry - now;

        return {
            expiry_date: expiry.toISOString(),
            status: msUntilExpiry < 0 ? 'expired' : 'pending',
            days_until_expiry: Math.ceil(msUntilExpiry / MS_PER_DAY),
            minutes_until_expiry: Math.ceil(msUntilExpiry / MS_PER_MINUTE),
            certificate_validity_minutes: testValidityMinutes
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = typeof employeeOrExpiryDate === 'object'
        ? employeeOrExpiryDate.expiry_date
        : employeeOrExpiryDate;
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((expiry - today) / MS_PER_DAY);
    const status = daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 30 ? 'pending' : 'active';

    return {
        status,
        days_until_expiry: daysUntilExpiry
    };
};

const mapEmployeeCertificate = (employee) => ({
    ...employee,
    stored_status: employee.status,
    ...getCertificateInfo(employee)
});

const ensureReceiptUploadColumn = async () => {
    if (receiptUploadColumnReady) return;

    try {
        await pool.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_file_url TEXT');
    } catch (error) {
        if (error.code === '42501') {
            console.warn('Skipping payments.receipt_file_url schema check because database user lacks ALTER permission.');
            receiptUploadColumnReady = true;
            return;
        }

        throw error;
    }

    receiptUploadColumnReady = true;
};

const saveReceiptUpload = async (receiptUpload, receiptNumber) => {
    if (!receiptUpload?.data) return null;

    const match = String(receiptUpload.data).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        const error = new Error('Receipt upload format is invalid');
        error.status = 400;
        throw error;
    }

    const mimeType = match[1];
    const uploadedExtension = path.extname(receiptUpload.name || '').replace('.', '').toLowerCase();
    const fallbackExtension = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(uploadedExtension)
        ? uploadedExtension.replace('jpeg', 'jpg')
        : null;
    const extension = RECEIPT_EXTENSIONS[mimeType] || fallbackExtension;
    if (!extension) {
        const error = new Error('Receipt upload must be a PDF, JPG, PNG, or WEBP file');
        error.status = 400;
        throw error;
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_RECEIPT_UPLOAD_BYTES) {
        const error = new Error('Receipt upload must be 5MB or smaller');
        error.status = 400;
        throw error;
    }

    await fs.mkdir(RECEIPT_UPLOAD_DIR, { recursive: true });
    const safeReceiptNumber = String(receiptNumber || Date.now()).replace(/[^a-z0-9_-]/gi, '-');
    const fileName = `${safeReceiptNumber}-${Date.now()}.${extension}`;
    await fs.writeFile(path.join(RECEIPT_UPLOAD_DIR, fileName), buffer);

    return `/uploads/receipts/${fileName}`;
};

const recordPayment = async ({
    employeeId,
    amount,
    paymentMethod,
    receiptNumber,
    receiptFileUrl,
    paymentDate,
    notes
}) => {
    try {
        return await pool.query(
            `INSERT INTO payments (
                employee_id, amount, payment_method, receipt_number,
                receipt_file_url, payment_date, approved_by, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
            RETURNING *`,
            [
                employeeId, amount, paymentMethod, receiptNumber, receiptFileUrl,
                paymentDate, 'Dkt. Juma Hassan', notes
            ]
        );
    } catch (error) {
        if (!['42501', '42703'].includes(error.code)) {
            throw error;
        }

        const fallbackNotes = [
            notes,
            receiptFileUrl ? `Receipt upload saved: ${receiptFileUrl}` : ''
        ].filter(Boolean).join('\n');

        return pool.query(
            `INSERT INTO payments (
                employee_id, amount, payment_method, receipt_number,
                payment_date, approved_by, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
            RETURNING *`,
            [
                employeeId, amount, paymentMethod, receiptNumber,
                paymentDate, 'Dkt. Juma Hassan', fallbackNotes || null
            ]
        );
    }
};

const logPaymentConfirmationSms = async ({ employee, employeeId, amount, newExpiryDate }) => {
    const smsMessage = `Hello ${employee.full_name}, we have received your payment of TZS ${amount}. Your certificate has been extended until ${newExpiryDate.toLocaleString()}. Thank you.`;

    const smsResult = await sendSms({
        to: employee.phone,
        message: smsMessage
    });

    const paymentStatus = smsResult.success ? 'sent' : (smsResult.skipped ? 'skipped' : 'failed');

    await pool.query(
        `INSERT INTO sms_logs (employee_id, phone, message, type, status)
         VALUES ($1, $2, $3, 'payment_confirmation', $4)`,
        [employeeId, employee.phone, smsMessage, paymentStatus]
    );
};

const buildExpirySms = (employee) => {
    const employeeName = employee.full_name || 'Mteja';

    return `Ndugu ${employeeName}, muda wa kibali chako cha afya kwa miezi 6 umeisha. Tafadhali fika katika hospitali ya mji bariadi (somanda) kwa ajili ya kupata kingine, fika mapema ili kuepuka usumbufu. Asante.`;
};

const logExpirySms = async (employee) => {
    const message = buildExpirySms(employee);
    let status = 'sent';

    const smsResult = await sendSms({
        to: employee.phone,
        message
    });

    if (!smsResult.success) {
        status = smsResult.skipped ? 'skipped' : 'failed';
    }

    await pool.query(
        `INSERT INTO sms_logs (employee_id, phone, message, type, status)
         VALUES ($1, $2, $3, 'expiry_reminder', $4)`,
        [employee.id, employee.phone, message, status]
    );

    return { message, smsResult };
};

// Get all employees
router.get('/', async (req, res) => {
    try {
        const { search, status, employer } = req.query;
        let query = `
            SELECT e.*, em.company_name as employer_name 
            FROM employees e
            LEFT JOIN employers em ON e.employer_id = em.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (e.full_name ILIKE $${paramCount} OR e.phone ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (status) {
            query += ` AND e.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (employer) {
            query += ` AND e.employer_id = $${paramCount}`;
            params.push(employer);
            paramCount++;
        }

        query += ` ORDER BY e.expiry_date ASC`;

        const result = await pool.query(query, params);
        res.json({ employees: result.rows.map(mapEmployeeCertificate) });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single employee
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.*, em.company_name as employer_name 
             FROM employees e
             LEFT JOIN employers em ON e.employer_id = em.id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({ employee: mapEmployeeCertificate(result.rows[0]) });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create employee
router.post('/', async (req, res) => {
    try {
        const {
            full_name, phone, email, position, department,
            employer_id, exam_date, expiry_date, health_status,
            blood_pressure, blood_sugar, vision, heart_condition
        } = req.body;

        const result = await pool.query(
            `INSERT INTO employees (
                full_name, phone, email, position, department,
                employer_id, exam_date, expiry_date, health_status,
                blood_pressure, blood_sugar, vision, heart_condition
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                full_name, phone, email, position, department,
                employer_id, exam_date, expiry_date, health_status,
                blood_pressure, blood_sugar, vision, heart_condition
            ]
        );

        // Create notification flags
        await pool.query(
            'INSERT INTO notification_flags (employee_id) VALUES ($1)',
            [result.rows[0].id]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Employee added successfully',
            employee: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update employee
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name, phone, email, position, department,
            employer_id, exam_date, expiry_date, health_status,
            blood_pressure, blood_sugar, vision, heart_condition
        } = req.body;
        const certificateInfo = getCertificateInfo(expiry_date);

        const result = await pool.query(
            `UPDATE employees SET
                full_name = $1,
                phone = $2,
                email = $3,
                position = $4,
                department = $5,
                employer_id = $6,
                exam_date = $7,
                expiry_date = $8,
                health_status = $9,
                blood_pressure = $10,
                blood_sugar = $11,
                vision = $12,
                heart_condition = $13,
                status = $14,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $15
             RETURNING *`,
            [
                full_name, phone, email, position, department,
                employer_id, exam_date, expiry_date, health_status,
                blood_pressure, blood_sugar, vision, heart_condition,
                certificateInfo.status, id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json({
            success: true,
            message: 'Employee updated successfully',
            employee: mapEmployeeCertificate(result.rows[0])
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Send expiry SMS to every employee expiring within 30 days or already expired
router.post('/send-expiry-sms', async (req, res) => {
    try {
        const testValidityMinutes = getTestValidityMinutes();
        const result = testValidityMinutes
            ? await pool.query(
                `SELECT e.*, em.company_name as employer_name
                 FROM employees e
                 LEFT JOIN employers em ON e.employer_id = em.id
                 WHERE COALESCE(e.updated_at, e.created_at) <= NOW()
                 ORDER BY e.expiry_date ASC`
            )
            : await pool.query(
                `SELECT e.*, em.company_name as employer_name
             FROM employees e
             LEFT JOIN employers em ON e.employer_id = em.id
             WHERE e.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
             ORDER BY e.expiry_date ASC`
            );

        const employees = result.rows.map(mapEmployeeCertificate);

        for (const employee of employees) {
            await logExpirySms(employee);
        }

        res.json({
            success: true,
            message: `SMS sent to ${employees.length} employees`,
            count: employees.length,
            employees
        });
    } catch (error) {
        console.error('Error sending expiry SMS:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Send expiry SMS to one employee
router.post('/:id/send-expiry-sms', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT e.*, em.company_name as employer_name
             FROM employees e
             LEFT JOIN employers em ON e.employer_id = em.id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employee = mapEmployeeCertificate(result.rows[0]);

        if (employee.status === 'active') {
            return res.status(400).json({
                message: 'Certificate is not due within 30 days'
            });
        }

        const smsDelivery = await logExpirySms(employee);

        res.json({
            success: true,
            message: smsDelivery.smsResult.success ? 'SMS sent successfully' : 'SMS not sent; logged for record',
            sms: {
                phone: employee.phone,
                message: smsDelivery.message,
                provider: smsDelivery.smsResult.provider,
                status: smsDelivery.smsResult.success ? 'sent' : (smsDelivery.smsResult.skipped ? 'skipped' : 'failed')
            },
            employee
        });
    } catch (error) {
        console.error('Error sending employee expiry SMS:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset certificate (LIPA NA RESET MUDA)
router.post('/:id/reset', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            payment_amount = 25000,
            payment_method = 'cash',
            receipt_number,
            payment_notes,
            receipt_upload
        } = req.body;

        // Get employee
        const employeeResult = await pool.query(
            `SELECT e.*, em.company_name as employer_name
             FROM employees e
             LEFT JOIN employers em ON e.employer_id = em.id
             WHERE e.id = $1`,
            [id]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employee = employeeResult.rows[0];
        const today = new Date();
        const newExpiryDate = new Date(today);
        const testValidityMinutes = getTestValidityMinutes();
        const finalReceiptNumber = receipt_number
            || `CASH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Date.now()}`;
        const receiptFileUrl = await saveReceiptUpload(receipt_upload, finalReceiptNumber);

        if (testValidityMinutes) {
            newExpiryDate.setMinutes(today.getMinutes() + testValidityMinutes);
        } else {
            const certificateValidityMonths = await getCertificateValidityMonths();
            newExpiryDate.setMonth(today.getMonth() + certificateValidityMonths);
        }

        if (receiptFileUrl) {
            await ensureReceiptUploadColumn();
        }

        // Update employee
        await pool.query(
            `UPDATE employees SET 
                exam_date = $1,
                expiry_date = $2,
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [today, newExpiryDate, id]
        );

        // Record payment
        const paymentResult = await recordPayment({
            employeeId: id,
            amount: payment_amount,
            paymentMethod: payment_method,
            receiptNumber: finalReceiptNumber,
            receiptFileUrl,
            paymentDate: today,
            notes: payment_notes
        });

        // Reset notification flags
        await pool.query(
            `UPDATE notification_flags SET 
                flag_30_days = FALSE,
                flag_14_days = FALSE,
                flag_7_days = FALSE,
                flag_expired = FALSE,
                flag_overdue = FALSE,
                updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $1`,
            [id]
        );

        res.json({
            success: true,
            message: 'Certificate renewed successfully',
            employee: {
                ...employee,
                exam_date: today,
                expiry_date: newExpiryDate,
                status: 'active'
            },
            payment: {
                ...paymentResult.rows[0],
                employee_name: employee.full_name,
                phone: employee.phone,
                email: employee.email,
                employer_name: employee.employer_name
            },
            new_expiry: newExpiryDate
        });

        logPaymentConfirmationSms({
            employee,
            employeeId: id,
            amount: payment_amount,
            newExpiryDate
        }).catch((smsError) => {
            console.error('Error logging payment confirmation SMS:', smsError);
        });
    } catch (error) {
        console.error('Error resetting certificate:', error);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Internal server error' });
    }
});

// Test SMS endpoint - send SMS to any phone number
router.post('/test-sms', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ message: 'Phone and message are required' });
        }

        const smsResult = await sendSms({
            to: phone,
            message
        });

        res.json({
            success: true,
            message: 'Test SMS sent',
            phone,
            result: smsResult
        });
    } catch (error) {
        console.error('Error sending test SMS:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
