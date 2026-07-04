import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../config/apiConfig';

const EmployerForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        registration_number: '',
        address: '',
        contact_person: '',
        contact_phone: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(apiClient.endpoints.employers.create, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/admin/employers');
        } catch (error) {
            console.error('Error saving employer:', error);
            alert('Hitilafu imetokea. Tafadhali jaribu tena.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="employer-form">
            <div className="page-header">
                <h1> Add Employer</h1>
            </div>

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Company Name *</label>
                        <input
                            type="text"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Registration Number</label>
                        <input
                            type="text"
                            name="registration_number"
                            value={formData.registration_number}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Contact Person</label>
                        <input
                            type="text"
                            name="contact_person"
                            value={formData.contact_person}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Contact Phone</label>
                        <input
                            type="tel"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '⏳ Waiting...' : '💾 Save'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/employers')}>
                        ❌ Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EmployerForm;
