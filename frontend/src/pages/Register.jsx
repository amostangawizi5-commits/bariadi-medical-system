import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../config/apiConfig';
import logo from '../components/logo.png';
import '../styles/Register.css';
import { useLanguage } from '../i18n/LanguageContext';

const Register = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirm_password) {
            setError(t('Password and confirmation do not match'));
            return;
        }

        if (formData.password.length < 8) {
            setError(t('Password must be at least 8 characters'));
            return;
        }

        setLoading(true);

        try {
            await axios.post(apiClient.endpoints.auth.register, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            });

            setSuccess(t('Account created successfully. You can now sign in.'));
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || t('Something went wrong. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-shell">
                <section className="login-visual" aria-label="Registration visual panel">
                    <div className="login-logo">
                        <img src={logo} alt="Bariadi District Council" />
                        <span>afya<strong>bariadi</strong></span>
                    </div>

                    <div className="medical-scene" aria-hidden="true">
                        <div className="scene-card certificate-card">
                            <span />
                            <span />
                            <span />
                            <b>REGISTER</b>
                        </div>
                        <div className="scene-card clinic-card">
                            <i>+</i>
                            <span />
                            <span />
                        </div>
                        <div className="scene-card report-card">
                            <em />
                            <em />
                            <em />
                        </div>
                    </div>

                    <div className="login-visual-copy">
                        <p>{t('Create your staff access')}</p>
                        <h1>{t('Medical Certificate Management')}</h1>
                        <span>{t('Register and get secure access to the health certificate dashboard.')}</span>
                    </div>
                </section>

                <section className="login-panel">
                    <div className="login-header">
                        <p className="subtitle">{t('New staff registration')}</p>
                        <h2>{t('Create account')}</h2>
                        <span>{t('Use your official information to request staff access.')}</span>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="success-message">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="first_name">{t('First Name')}</label>
                                <input
                                    id="first_name"
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Juma"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="last_name">{t('Last Name')}</label>
                                <input
                                    id="last_name"
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Hassan"
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">{t('Email')}</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="juma@afya.go.tz"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">{t('Phone')}</label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0713 123 456"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">{t('Password')}</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    className="form-input"
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <small className="password-hint">
                                {t('Password must be at least 8 characters')}
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm_password">{t('Confirm Password')}</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="confirm_password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirm_password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    className="form-input"
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-login"
                            disabled={loading}
                        >
                            {loading ? t('Signing in...') : t('Create Account')}
                        </button>

                        <div className="login-footer-links">
                            <Link to="/login" className="register-link">
                                {t('Already have an account? Sign in')}
                            </Link>
                        </div>
                    </form>

                    <div className="login-footer">
                        <p>© 2026 Bariadi District Health - Simiyu</p>
                        <p className="version">Version 1.0.0</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Register;
