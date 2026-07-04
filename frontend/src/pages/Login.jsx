import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../config/apiConfig';
import logo from '../components/logo.png';
import '../styles/Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const loginRedirectTimer = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('token')) {
            navigate('/admin/dashboard', { replace: true });
        }

        return () => window.clearTimeout(loginRedirectTimer.current);
    }, [navigate]);

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
        setLoading(true);

        try {
            const response = await axios.post(apiClient.endpoints.auth.login, {
                email: formData.email,
                password: formData.password
            });

            if (response.data.success) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setSuccess('Login successfully');
                loginRedirectTimer.current = window.setTimeout(() => {
                    setLoading(false);
                    navigate('/admin/dashboard');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Email or password is incorrect');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-shell">
                <section className="login-visual" aria-label="System overview">
                    <div className="login-logo">
                        <img src={logo} alt="Bariadi District Council" />
                        <span>afya<strong>bariadi</strong></span>
                    </div>

                    <div className="medical-scene" aria-hidden="true">
                        <div className="scene-card certificate-card">
                            <span />
                            <span />
                            <span />
                            <b>VALID</b>
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
                        <p>District Health Office</p>
                        <h1>Medical Certificate Management</h1>
                        <span>Secure access for authorized health officers only.</span>
                    </div>
                </section>

                <section className="login-panel">
                    <div className="login-header">
                        <p className="subtitle">Welcome back</p>
                        <h2>Sign in</h2>
                        <span>Use your official account to open the dashboard.</span>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="error-message success-message">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@afya.bariadi.go.tz"
                                className="form-input"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
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
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-login"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="btn-login-spinner" aria-hidden="true" />
                                    {!success && <span>Signing in...</span>}
                                </>
                            ) : 'Open Dashboard'}
                        </button>

                        <div className="login-footer-links">
                            <Link to="/register" className="register-link">
                                Request staff account
                            </Link>
                        </div>
                    </form>

                    <div className="login-footer">
                        <p>2026 Bariadi District Health - Simiyu</p>
                        <p className="version">Version 1.0.0</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
