import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../config/apiConfig';

const EmployerList = () => {
    const [employers, setEmployers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployers();
    }, []);

    const fetchEmployers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.employers.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployers(response.data.employers || []);
        } catch (error) {
            console.error('Error fetching employers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="employer-list">
            <div className="page-header">
                <h1> Employers</h1>
                <Link to="/admin/employers/new" className="btn btn-primary">
                    Add Employer
                </Link>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Company Name</th>
                            <th>Contact Person</th>
                            <th>Phone</th>
                            <th>Patients</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employers.length > 0 ? (
                            employers.map((emp, index) => (
                                <tr key={emp.id}>
                                    <td>{index + 1}</td>
                                    <td>{emp.company_name}</td>
                                    <td>{emp.contact_person || 'N/A'}</td>
                                    <td>{emp.contact_phone || 'N/A'}</td>
                                    <td>{emp.employee_count || 0}</td>
                                    <td>
                                        <span className={`badge badge-${emp.status === 'active' ? 'success' : 'danger'}`}>
                                            {emp.status === 'active' ? ' Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                                <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    No employers registered
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmployerList;
