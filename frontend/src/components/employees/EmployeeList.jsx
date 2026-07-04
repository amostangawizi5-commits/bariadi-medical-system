import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../config/apiConfig';
import { useLanguage } from '../../i18n/LanguageContext';

const EmployeeList = () => {
    const location = useLocation();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(location.state?.filterStatus || '');
    const [sendingId, setSendingId] = useState(null);
    const [sendingBulk, setSendingBulk] = useState(false);
    const [notice, setNotice] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.employees.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status) => {
        if (status === 'active') return t('Active');
        if (status === 'pending') return t('Expiring');
        return t('Expired');
    };

    const getDaysLabel = (days) => {
        if (days === 0) return t('Today');
        if (days < 0) return `${t('Expired days')} ${Math.abs(days)}`;
        return `${t('Days left')} ${days}`;
    };

    const sendSms = async (employeeId) => {
        setSendingId(employeeId);
        setNotice('');

        try {
            const token = localStorage.getItem('token');
            await axios.post(apiClient.endpoints.employees.sendExpirySmsOne(employeeId), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotice(t('SMS sent successfully.'));
        } catch (error) {
            setNotice(error.response?.data?.message || t('SMS failed. Please try again.'));
        } finally {
            setSendingId(null);
        }
    };

    const sendBulkSms = async () => {
        setSendingBulk(true);
        setNotice('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(apiClient.endpoints.employees.sendExpirySms, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotice(response.data.message || t('SMS messages sent successfully.'));
        } catch (error) {
            setNotice(error.response?.data?.message || t('SMS messages failed. Please try again.'));
        } finally {
            setSendingBulk(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            emp.phone?.includes(search) ||
            emp.position?.toLowerCase().includes(search.toLowerCase());

        let matchesStatus = true;
        if (statusFilter) {
            if (statusFilter === 'active') {
                matchesStatus = emp.status === 'active' && (emp.days_until_expiry ?? 0) > 30;
            } else if (statusFilter === 'pending') {
                matchesStatus = emp.status === 'pending' || ((emp.days_until_expiry ?? 0) > 0 && (emp.days_until_expiry ?? 0) <= 30);
            } else if (statusFilter === 'expired') {
                matchesStatus = emp.status === 'expired' || (emp.days_until_expiry ?? 0) <= 0;
            }
        }

        return matchesSearch && matchesStatus;
    });

    const expiringCount = employees.filter(emp => emp.status !== 'active').length;

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="employee-list">
            <div className="page-header">
                <div>
                    <p className="section-kicker">{t('Certificate registry')}</p>
                    <h1>{t('Registered Patients')}</h1>
                </div>
                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={sendBulkSms}
                        disabled={sendingBulk || expiringCount === 0}
                    >
                        {sendingBulk ? 'Sending...' : `Send SMS (${expiringCount})`}
                    </button>
                    <Link to="/admin/employees/new" className="btn btn-primary">
                        <span>+</span>
                        <span>Add Patient</span>
                    </Link>
                </div>
            </div>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder={t('Search by name, job or phone...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                />
                <span className="registry-summary">
                    {t('Expiring within 30 days or expired')}: <strong>{expiringCount}</strong>
                </span>
            </div>

            {notice && <div className="notice-message">{notice}</div>}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Phone</th>
                            <th>Expiry Date</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp, index) => (
                                    <tr key={emp.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <strong>{emp.full_name}</strong>
                                            <span className="table-subtext">{emp.email || t('No email')}</span>
                                        </td>
                                        <td>{emp.position}</td>
                                        <td>{emp.phone}</td>
                                        <td>{new Date(emp.expiry_date).toLocaleDateString()}</td>
                                        <td>{getDaysLabel(emp.days_until_expiry ?? 0)}</td>
                                        <td>
                                            <span className={`badge badge-${emp.status === 'active' ? 'success' : emp.status === 'pending' ? 'warning' : 'danger'}`}>
                                                {getStatusLabel(emp.status)}
                                            </span>
                                        </td>
                                        <td className="row-actions">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline"
                                                onClick={() => sendSms(emp.id)}
                                                disabled={emp.status === 'active' || sendingId === emp.id}
                                                title={emp.status === 'active' ? 'Certificate not due' : 'Send SMS'}
                                            >
                                                {sendingId === emp.id ? '...' : 'SMS'}
                                            </button>
                                            <Link to={`/admin/employees/${emp.id}`} className="btn btn-sm btn-primary">
                                                {t('Edit')}
                                            </Link>
                                            <Link
                                                to={`/admin/employees/${emp.id}/renew`}
                                                state={{ employee: emp }}
                                                className="btn btn-sm btn-success"
                                                title="Pay cash and renew certificate"
                                            >
                                                {t('Renew')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="empty-table-cell">
                                    {t('No patients registered')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployeeList;
