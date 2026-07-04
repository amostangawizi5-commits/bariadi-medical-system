import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL, apiClient } from '../../config/apiConfig';

const PaymentManagement = () => {
    const [payments, setPayments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const token = localStorage.getItem('token');
            const [paymentResponse, patientResponse] = await Promise.all([
                axios.get(apiClient.endpoints.payments.history, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(apiClient.endpoints.employees.list, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            const patientRows = patientResponse.data.employees || [];
            const patientById = patientRows.reduce((map, patient) => {
                map[String(patient.id)] = patient;
                return map;
            }, {});
            const paymentRows = (paymentResponse.data.payments || []).map((payment) => {
                const patient = patientById[String(payment.employee_id)];
                return {
                    ...payment,
                    employee_name: patient?.full_name || payment.employee_name || 'N/A',
                    phone: patient?.phone || payment.phone || '',
                    email: patient?.email || payment.email || '',
                    employer_name: patient?.employer_name || payment.employer_name || 'N/A'
                };
            });

            setPayments(paymentRows);
            setPatients(patientRows);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const toAmount = (value) => Number.parseFloat(value || 0) || 0;

    const formatMoney = (value) => `TZS ${toAmount(value).toLocaleString()}`;

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const getReceiptFileUrl = (receiptFileUrl) => {
        if (!receiptFileUrl) return '';
        if (/^https?:\/\//i.test(receiptFileUrl)) return receiptFileUrl;
        return `${API_BASE_URL}${receiptFileUrl}`;
    };

    const totalPaid = payments
        .filter((payment) => payment.status === 'approved')
        .reduce((sum, payment) => sum + toAmount(payment.amount), 0);

    const paymentsByPatient = useMemo(() => payments.reduce((groups, payment) => {
        const key = String(payment.employee_id || payment.employee_name || payment.id);
        groups[key] = groups[key] || [];
        groups[key].push(payment);
        return groups;
    }, {}), [payments]);

    const paymentRows = useMemo(() => patients.map((patient) => {
        const patientPayments = paymentsByPatient[String(patient.id)] || [];
        const latestPayment = patientPayments[0];

        return {
            id: latestPayment?.id || `patient-${patient.id}`,
            employee_id: patient.id,
            employee_name: patient.full_name || latestPayment?.employee_name || 'N/A',
            phone: patient.phone || latestPayment?.phone || '',
            email: patient.email || latestPayment?.email || '',
            employer_name: patient.employer_name || latestPayment?.employer_name || 'N/A',
            amount: latestPayment?.amount,
            payment_method: latestPayment?.payment_method,
            receipt_number: latestPayment?.receipt_number,
            receipt_file_url: latestPayment?.receipt_file_url,
            payment_date: latestPayment?.payment_date,
            status: latestPayment?.status || 'pending',
            has_payment: Boolean(latestPayment),
            payment_count: patientPayments.length
        };
    }).sort((a, b) => {
        if (a.payment_date && b.payment_date) {
            return new Date(b.payment_date) - new Date(a.payment_date);
        }
        if (a.payment_date) return -1;
        if (b.payment_date) return 1;
        return a.employee_name.localeCompare(b.employee_name);
    }), [patients, paymentsByPatient]);

    const stats = useMemo(() => paymentRows.reduce((summary, row) => ({
        ...summary,
        total: summary.total + 1,
        [row.status]: (summary[row.status] || 0) + 1
    }), { total: 0, pending: 0, approved: 0, rejected: 0 }), [paymentRows]);

    const filteredPayments = paymentRows.filter((payment) => (
        statusFilter === 'all' || payment.status === statusFilter
    ));

    const paymentCards = [
        { key: 'all', label: 'Total', value: stats.total || 0, tone: '', icon: 'ALL' },
        { key: 'pending', label: 'Pending', value: stats.pending || 0, tone: 'warning', icon: 'PEN' },
        { key: 'approved', label: 'Approved', value: stats.approved || 0, tone: 'success', icon: 'OK' },
        { key: 'rejected', label: 'Rejected', value: stats.rejected || 0, tone: 'danger', icon: 'NO' },
        { key: 'paid', label: 'Total Paid', value: formatMoney(totalPaid), tone: 'success payment-total-card', icon: 'TZS' }
    ];

    const employeeStatements = Object.values(payments.reduce((groups, payment) => {
        const key = payment.employee_id || payment.employee_name || payment.id;
        const current = groups[key] || {
            employee_id: payment.employee_id,
            employee_name: payment.employee_name || 'N/A',
            phone: payment.phone || '',
            email: payment.email || '',
            employer_name: payment.employer_name || 'N/A',
            payments: [],
            total_paid: 0
        };

        current.payments.push(payment);
        if (payment.status === 'approved') {
            current.total_paid += toAmount(payment.amount);
        }
        groups[key] = current;
        return groups;
    }, {}));

    const printEmployeeStatement = (statement) => {
        const statementWindow = window.open('', '_blank', 'width=900,height=700');
        if (!statementWindow) {
            window.print();
            return;
        }

        const rows = statement.payments.map((payment, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(new Date(payment.payment_date).toLocaleString())}</td>
                <td>${escapeHtml(payment.payment_method || 'cash')}</td>
                <td>${escapeHtml(payment.receipt_number || '-')}</td>
                <td>${escapeHtml(payment.status || '-')}</td>
                <td>${escapeHtml(formatMoney(payment.amount))}</td>
            </tr>
        `).join('');

        statementWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>Patient Payment Statement - ${escapeHtml(statement.employee_name)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #102033; margin: 32px; }
                        .header { border-bottom: 3px solid #126c8f; padding-bottom: 16px; margin-bottom: 24px; }
                        h1 { margin: 0; font-size: 24px; }
                        h2 { margin: 8px 0 0; font-size: 18px; color: #126c8f; }
                        .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 22px; }
                        .meta div { border: 1px solid #d9e2ec; padding: 10px; }
                        .meta span { display: block; color: #667085; font-size: 12px; font-weight: 700; }
                        .meta strong { display: block; margin-top: 4px; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #d9e2ec; padding: 10px; text-align: left; font-size: 13px; }
                        th { background: #f7fafc; }
                        .total { margin-top: 18px; padding: 14px; background: #e7f6ef; font-size: 18px; font-weight: 800; text-align: right; }
                        @media print { button { display: none; } body { margin: 18px; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Bariadi Health Medical Certificate System</h1>
                        <h2>Payment Statement</h2>
                    </div>
                    <div class="meta">
                        <div><span>Patient</span><strong>${escapeHtml(statement.employee_name)}</strong></div>
                        <div><span>Phone</span><strong>${escapeHtml(statement.phone || '-')}</strong></div>
                        <div><span>Email</span><strong>${escapeHtml(statement.email || '-')}</strong></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Receipt</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="total">Total Paid: ${escapeHtml(formatMoney(statement.total_paid))}</div>
                    <script>
                        window.onload = () => {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        statementWindow.document.close();
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="payment-management">
            <div className="page-header">
                <h1>Manage Payments</h1>
            </div>

            <div className="stats-grid">
                {paymentCards.map((card) => {
                    const nextFilter = card.key === 'paid' ? 'approved' : card.key;
                    const isActive = statusFilter === nextFilter;

                    return (
                        <button
                            type="button"
                            className={`stat-card clickable-stat-card ${card.tone} ${isActive ? 'active' : ''}`}
                            key={card.key}
                            onClick={() => setStatusFilter(nextFilter)}
                        >
                            <div className="stat-icon">{card.icon}</div>
                            <div className="stat-info">
                                <h3>{card.label}</h3>
                                <p className={`stat-number${card.key === 'paid' ? ' money-stat' : ''}`}>{card.value}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="section-header compact">
                <h2>{statusFilter === 'all' ? 'All Payments' : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} Payments`}</h2>
                {statusFilter !== 'all' && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setStatusFilter('all')}>
                        Show All
                    </button>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Patient</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Receipt</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Statement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayments.length > 0 ? (
                            filteredPayments.map((p, index) => (
                                <tr key={p.id}>
                                    <td>{index + 1}</td>
                                    <td>{p.employee_name}</td>
                                    <td>{p.has_payment ? formatMoney(p.amount) : '-'}</td>
                                    <td>{p.payment_method || '-'}</td>
                                    <td>
                                        <div className="receipt-cell">
                                            <span>{p.receipt_number || '-'}</span>
                                            {p.receipt_file_url && (
                                                <a
                                                    href={getReceiptFileUrl(p.receipt_file_url)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View upload
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleString() : '-'}</td>
                                    <td>
                                        <span className={`badge badge-${p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}`}>
                                            {p.status === 'approved' ? 'Approved' :
                                             p.status === 'pending' ? (p.has_payment ? 'Pending' : 'No Payment') : 'Rejected'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline"
                                            onClick={() => {
                                                const statement = employeeStatements.find((item) => item.employee_id === p.employee_id);
                                                if (statement) printEmployeeStatement(statement);
                                            }}
                                            disabled={!p.has_payment}
                                        >
                                            Print
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                    No payments recorded
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentManagement;
