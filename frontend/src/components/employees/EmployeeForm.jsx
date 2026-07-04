import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../config/apiConfig';

const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const addMonths = (value, months) => {
    const date = new Date(value || Date.now());
    date.setMonth(date.getMonth() + months);
    return formatDateInput(date);
};

const EmployeeForm = ({ mode }) => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const isRenewMode = mode === 'renew';
    const diseaseOptions = [
        'Tuberculosis',
        'Typhoid',
        'Physical Examination',
        'Skin Diseases'
    ];
    const maxReceiptUploadBytes = 5 * 1024 * 1024;
    const [loading, setLoading] = useState(false);
    const [certificateValidityMonths, setCertificateValidityMonths] = useState(6);
    const [paymentData, setPaymentData] = useState({
        payment_amount: 25000,
        receipt_number: '',
        receipt_file: null,
        payment_notes: 'Cash renewal from Health Officer dashboard'
    });
    const [formData, setFormData] = useState({
        first_name: '',
        second_name: '',
        last_name: '',
        phone: '',
        email: '',
        position: '',
        department: '',
        employer_id: '',
        exam_date: new Date().toISOString().split('T')[0],
        expiry_date: addMonths(Date.now(), 6),
        health_status: '',
        blood_pressure: '',
        blood_sugar: '',
        vision: '',
        heart_condition: ''
    });

    const getRenewalExpiryDate = () => {
        const date = new Date();
        date.setMonth(date.getMonth() + certificateValidityMonths);
        return date.toISOString().split('T')[0];
    };

    const splitFullName = (value = '') => {
        const parts = String(value).trim().split(/\s+/).filter(Boolean);

        if (parts.length === 0) {
            return { first_name: '', second_name: '', last_name: '' };
        }

        if (parts.length === 1) {
            return { first_name: parts[0], second_name: '', last_name: '' };
        }

        if (parts.length === 2) {
            return { first_name: parts[0], second_name: '', last_name: parts[1] };
        }

        return {
            first_name: parts[0],
            second_name: parts[1],
            last_name: parts.slice(2).join(' ')
        };
    };

    const buildFullName = (data) => [data.first_name, data.second_name, data.last_name]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ');

    const toAmount = (value) => Number.parseFloat(value || 0) || 0;

    const formatMoney = (value) => `TZS ${toAmount(value).toLocaleString()}`;

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatDateTime = (value) => {
        const date = new Date(value || Date.now());
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
    };

    const readReceiptFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result
        });
        reader.onerror = () => reject(new Error('Unable to read receipt file'));
        reader.readAsDataURL(file);
    });

    const printPaymentReceipt = (receiptWindow, payment, employee, newExpiryDate) => {
        if (!receiptWindow) {
            alert('Payment recorded. Open Payments to print the receipt.');
            return;
        }

        const receiptNumber = payment.receipt_number || `PAY-${payment.id || Date.now()}`;
        const employeeName = payment.employee_name || employee.full_name || buildFullName(formData);

        receiptWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>Cash Payment Receipt - ${escapeHtml(receiptNumber)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #f5f7fb; }
                        .receipt { width: min(620px, calc(100% - 40px)); min-height: 760px; margin: 24px auto; padding: 32px; background: #fff; border: 1px solid #d9e2ec; }
                        .header { text-align: center; border-bottom: 2px solid #126c8f; padding-bottom: 14px; margin-bottom: 18px; }
                        h1 { margin: 0; font-size: 19px; text-transform: uppercase; }
                        h2 { margin: 8px 0 0; font-size: 16px; color: #126c8f; }
                        .row { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #edf2f7; padding: 12px 0; font-size: 14px; }
                        .row span:first-child { color: #667085; font-weight: 700; }
                        .row strong { text-align: right; }
                        .amount { margin-top: 24px; padding: 18px; background: #e7f6ef; text-align: center; font-size: 24px; font-weight: 800; color: #0f5132; }
                        .footer { margin-top: 72px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; }
                        .signature { border-top: 1px solid #98a2b3; padding-top: 10px; text-align: center; }
                        @media print { body { background: #fff; } .receipt { width: 100%; min-height: calc(100vh - 64px); margin: 0 auto; border: 0; box-sizing: border-box; } }
                    </style>
                </head>
                <body>
                    <main class="receipt">
                        <div class="header">
                            <h1>Afya Bariadi Medical Certificate System</h1>
                            <h2>Cash Payment Receipt</h2>
                        </div>
                        <div class="row"><span>Receipt No.</span><strong>${escapeHtml(receiptNumber)}</strong></div>
                        <div class="row"><span>Date</span><strong>${escapeHtml(formatDateTime(payment.payment_date))}</strong></div>
                        <div class="row"><span>Patient</span><strong>${escapeHtml(employeeName)}</strong></div>
                        <div class="row"><span>Phone</span><strong>${escapeHtml(payment.phone || employee.phone || '-')}</strong></div>
                        <div class="row"><span>Payment Method</span><strong>${escapeHtml(payment.payment_method || 'cash')}</strong></div>
                        <div class="row"><span>Status</span><strong>${escapeHtml(payment.status || 'approved')}</strong></div>
                        <div class="row"><span>New Expiry</span><strong>${escapeHtml(formatDateTime(newExpiryDate))}</strong></div>
                        <div class="amount">${escapeHtml(formatMoney(payment.amount))}</div>
                        <div class="footer">
                            <div class="signature">Received By</div>
                            <div class="signature">Official Stamp</div>
                        </div>
                    </main>
                    <script>
                        window.onload = () => {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        receiptWindow.document.close();
    };

    useEffect(() => {
        if (id) {
            fetchEmployee();
        }
    }, [id]);

    useEffect(() => {
        const fetchCertificateValidity = async () => {
            try {
                const response = await axios.get(apiClient.endpoints.settings.list);
                const months = Number(response.data.settings?.certificate_validity) || 6;
                setCertificateValidityMonths(months);

                if (!id && !isRenewMode) {
                    setFormData((prev) => ({
                        ...prev,
                        expiry_date: addMonths(prev.exam_date, months)
                    }));
                }
            } catch (error) {
                console.error('Error fetching certificate settings:', error);
            }
        };

        fetchCertificateValidity();
    }, [id, isRenewMode]);

    const fetchEmployee = async () => {
        if (String(id).startsWith('sample-') && location.state?.employee) {
            const emp = location.state.employee;
            const fallbackExpiry = emp.days_until_expiry !== undefined
                ? new Date(Date.now() + Number(emp.days_until_expiry) * 24 * 60 * 60 * 1000)
                : '';
            const names = splitFullName(emp.full_name || '');
            setFormData({
                first_name: names.first_name,
                second_name: names.second_name,
                last_name: names.last_name,
                phone: emp.phone || '',
                email: emp.email || '',
                position: emp.position || '',
                department: emp.department || '',
                employer_id: emp.employer_id || '',
                exam_date: formatDateInput(emp.exam_date) || new Date().toISOString().split('T')[0],
                expiry_date: formatDateInput(emp.expiry_date) || formatDateInput(fallbackExpiry),
                health_status: emp.health_status || '',
                blood_pressure: emp.blood_pressure || '',
                blood_sugar: emp.blood_sugar || '',
                vision: emp.vision || '',
                heart_condition: emp.heart_condition || ''
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.employees.get(id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const emp = response.data.employee;
            const names = splitFullName(emp.full_name || '');
            setFormData({
                first_name: names.first_name,
                second_name: names.second_name,
                last_name: names.last_name,
                phone: emp.phone || '',
                email: emp.email || '',
                position: emp.position || '',
                department: emp.department || '',
                employer_id: emp.employer_id || '',
                exam_date: formatDateInput(emp.exam_date),
                expiry_date: formatDateInput(emp.expiry_date),
                health_status: emp.health_status || '',
                blood_pressure: emp.blood_pressure || '',
                blood_sugar: emp.blood_sugar || '',
                vision: emp.vision || '',
                heart_condition: emp.heart_condition || ''
            });
        } catch (error) {
            console.error('Error fetching employee:', error);
        }
    };

    const handlePaymentChange = (e) => {
        setPaymentData({
            ...paymentData,
            [e.target.name]: e.target.value
        });
    };

    const handleReceiptFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (file && file.size > maxReceiptUploadBytes) {
            alert('Receipt file must be 5MB or smaller.');
            e.target.value = '';
            return;
        }

        setPaymentData({
            ...paymentData,
            receipt_file: file
        });
    };

    const handleChange = (e) => {
        if (e.target.name === 'exam_date' && !id && !isRenewMode) {
            setFormData({
                ...formData,
                exam_date: e.target.value,
                expiry_date: addMonths(e.target.value, certificateValidityMonths)
            });
            return;
        }

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let receiptWindow = null;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            if (isRenewMode) {
                if (String(id).startsWith('sample-')) {
                    alert('This is sample data. Use a real certificate to perform cash renewal.');
                    return;
                }

                receiptWindow = window.open('', '_blank', 'width=720,height=860');
                if (receiptWindow) {
                    receiptWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Recording cash payment...</p>');
                }

                const receiptUpload = paymentData.receipt_file
                    ? await readReceiptFile(paymentData.receipt_file)
                    : undefined;

                const response = await axios.post(apiClient.endpoints.employees.reset(id), {
                    payment_amount: Number(paymentData.payment_amount) || 25000,
                    payment_method: 'cash',
                    receipt_number: paymentData.receipt_number || undefined,
                    payment_notes: paymentData.payment_notes,
                    receipt_upload: receiptUpload
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                printPaymentReceipt(
                    receiptWindow,
                    response.data.payment || {
                        amount: paymentData.payment_amount,
                        payment_method: 'cash',
                        receipt_number: paymentData.receipt_number,
                        payment_date: new Date(),
                        status: 'approved'
                    },
                    response.data.employee || formData,
                    response.data.new_expiry
                );

                navigate('/admin/payments');
                return;
            }

            const url = id ?
                apiClient.endpoints.employees.update(id) :
                apiClient.endpoints.employees.create;
            const method = id ? 'put' : 'post';
            
            const payload = {
                ...formData,
                full_name: buildFullName(formData),
                employer_id: formData.employer_id || null
            };

            await axios[method](url, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            navigate('/admin/employees');
        } catch (error) {
            console.error('Error saving employee:', error);
            if (receiptWindow && !receiptWindow.closed) {
                receiptWindow.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 24px; color: #b42318;">Payment was not recorded. Please try again.</p>';
            }
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formTitle = isRenewMode
        ? 'Confirm Cash Renewal'
        : id ? 'Edit Patient' : 'Add Patient';

    return (
        <div className="employee-form">
            <div className="page-header">
                <h1>{formTitle}</h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card">
                {isRenewMode && (
                    <div className="renew-form-summary">
                        <div>
                            <span>Current expiry date</span>
                            <strong>{formData.expiry_date || 'Not available'}</strong>
                        </div>
                        <div>
                            <span>New expiry date after renewal</span>
                            <strong>{getRenewalExpiryDate()}</strong>
                        </div>
                        <div>
                            <span>Payment method</span>
                            <strong>Cash</strong>
                        </div>
                    </div>
                )}

                <div className="form-grid">
                    <div className="form-group">
                        <label>First Name *</label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Middle Name</label>
                        <input
                            type="text"
                            name="second_name"
                            value={formData.second_name}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Last Name *</label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Position *</label>
                        <input
                            type="text"
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Department</label>
                        <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Disease / Examination *</label>
                        <select
                            name="health_status"
                            value={formData.health_status}
                            onChange={handleChange}
                            required
                            className="form-input"
                        >
                            <option value="">Select disease or examination</option>
                            {diseaseOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Examination Date *</label>
                        <input
                            type="date"
                            name="exam_date"
                            value={formData.exam_date}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>{isRenewMode ? 'Current expiry date *' : 'Expiry date *'}</label>
                        <input
                            type="date"
                            name="expiry_date"
                            value={formData.expiry_date}
                            onChange={handleChange}
                            required
                            readOnly={isRenewMode}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Blood Pressure</label>
                        <input
                            type="text"
                            name="blood_pressure"
                            value={formData.blood_pressure}
                            onChange={handleChange}
                            placeholder="120/80"
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Blood Sugar</label>
                        <input
                            type="text"
                            name="blood_sugar"
                            value={formData.blood_sugar}
                            onChange={handleChange}
                            placeholder="5.2"
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Vision</label>
                        <input
                            type="text"
                            name="vision"
                            value={formData.vision}
                            onChange={handleChange}
                            placeholder="6/6"
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Heart Condition</label>
                        <input
                            type="text"
                            name="heart_condition"
                            value={formData.heart_condition}
                            onChange={handleChange}
                            placeholder="Kawaida"
                            className="form-input"
                        />
                    </div>
                </div>

                {isRenewMode && (
                    <div className="renew-payment-grid">
                        <div className="form-group">
                            <label>Amount Received (TSh) *</label>
                            <input
                                type="number"
                                name="payment_amount"
                                value={paymentData.payment_amount}
                                onChange={handlePaymentChange}
                                min="0"
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Receipt Number</label>
                            <input
                                type="text"
                                name="receipt_number"
                                value={paymentData.receipt_number}
                                onChange={handlePaymentChange}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Upload Patient Receipt (Optional)</label>
                            <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                onChange={handleReceiptFileChange}
                                className="form-input"
                            />
                            {paymentData.receipt_file && (
                                <span className="form-help">
                                    Selected: {paymentData.receipt_file.name}
                                </span>
                            )}
                        </div>

                        <div className="form-group full-width">
                            <label>Payment Notes</label>
                            <textarea
                                name="payment_notes"
                                value={paymentData.payment_notes}
                                onChange={handlePaymentChange}
                                className="form-input"
                            />
                        </div>
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : isRenewMode ? 'Confirm Cash & Renew' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/employees')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EmployeeForm;
