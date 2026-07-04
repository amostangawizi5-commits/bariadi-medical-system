import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { apiClient } from '../../config/apiConfig';

const Reports = () => {
    const [patients, setPatients] = useState([]);
    const [activeStatus, setActiveStatus] = useState('total');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.employees.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatients(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPatientStatus = (patient) => {
        const days = patient.days_until_expiry ?? 0;
        if (patient.status === 'expired' || days < 0) return 'expired';
        if (patient.status === 'pending' || days <= 30) return 'pending';
        return 'active';
    };

    const getStatusLabel = (status) => {
        if (status === 'active') return 'Active';
        if (status === 'pending') return 'Expiring';
        return 'Expired';
    };

    const getDaysLabel = (patient) => {
        const days = patient.days_until_expiry ?? 0;
        if (days === 0) return 'Today';
        if (days < 0) return `Expired ${Math.abs(days)} days`;
        return `${days} days`;
    };

    const filteredPatients = useMemo(() => patients.filter((patient) => {
        return activeStatus === 'total' || getPatientStatus(patient) === activeStatus;
    }), [patients, activeStatus]);

    const reportCounts = useMemo(() => patients.reduce((counts, patient) => {
        const status = getPatientStatus(patient);
        return {
            ...counts,
            total: counts.total + 1,
            [status]: counts[status] + 1
        };
    }, { total: 0, active: 0, pending: 0, expired: 0 }), [patients]);

    const reportCards = [
        { key: 'total', label: 'Total Patients', value: reportCounts.total, tone: '', meta: 'All records' },
        { key: 'active', label: 'Active', value: reportCounts.active, tone: 'success', meta: 'Valid certificates' },
        { key: 'pending', label: 'Expiring', value: reportCounts.pending, tone: 'warning', meta: 'Within 30 days' },
        { key: 'expired', label: 'Expired', value: reportCounts.expired, tone: 'danger', meta: 'Needs renewal' }
    ];

    const reportTitle = reportCards.find((card) => card.key === activeStatus)?.label || 'Patients';

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="reports">
            <div className="page-header">
                <h1>Reports</h1>
            </div>

            <div className="report-section">
                <h2>General Summary</h2>
                <div className="stats-grid">
                    {reportCards.map((card) => (
                        <button
                            type="button"
                            className={`stat-card clickable-stat-card ${card.tone} ${activeStatus === card.key ? 'active' : ''}`}
                            key={card.key}
                            onClick={() => setActiveStatus(card.key)}
                        >
                            <div className="stat-topline">
                                <span className="stat-meta">{card.meta}</span>
                            </div>
                            <div className="stat-info">
                                <h3>{card.label}</h3>
                                <p className="stat-number">{card.value}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="report-section">
                <div className="section-header">
                    <h2>{reportTitle}</h2>
                    {activeStatus !== 'total' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setActiveStatus('total')}
                        >
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
                                <th>Phone</th>
                                <th>Expiry Date</th>
                                <th>Days</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient, index) => {
                                    const status = getPatientStatus(patient);
                                    return (
                                        <tr key={patient.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <strong>{patient.full_name}</strong>
                                                <span className="table-subtext">{patient.position || 'N/A'}</span>
                                            </td>
                                            <td>{patient.phone || 'N/A'}</td>
                                            <td>{patient.expiry_date ? new Date(patient.expiry_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>{getDaysLabel(patient)}</td>
                                            <td>
                                                <span className={`badge badge-${status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'danger'}`}>
                                                    {getStatusLabel(status)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-table-cell">
                                        No patient data found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
