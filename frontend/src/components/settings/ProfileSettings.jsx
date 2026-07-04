import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiClient } from '../../config/apiConfig';

const emptyForm = {
    username: '',
    full_name: '',
    email: '',
    phone: '',
    profile_image: '',
    current_password: '',
    new_password: ''
};

const ProfileSettings = ({ user, onUserUpdate }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData((prev) => ({
                ...prev,
                username: user.username || '',
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                profile_image: user.profile_image || ''
            }));
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(apiClient.endpoints.auth.me, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const nextUser = response.data.user;
            setFormData((prev) => ({
                ...prev,
                username: nextUser.username || '',
                full_name: nextUser.full_name || '',
                email: nextUser.email || '',
                phone: nextUser.phone || '',
                profile_image: nextUser.profile_image || ''
            }));
            onUserUpdate?.(nextUser);
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    const openModal = () => {
        setMessage('');
        setError('');
        setIsOpen(true);
        if (!user) fetchProfile();
    };

    const closeModal = () => {
        setIsOpen(false);
        setMessage('');
        setError('');
        setFormData((prev) => ({
            ...prev,
            current_password: '',
            new_password: ''
        }));
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setMessage('');
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please choose a valid image file.');
            return;
        }

        if (file.size > 1000000) {
            setError('Profile image must be under 1MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData((prev) => ({
                ...prev,
                profile_image: reader.result
            }));
            setError('');
            setMessage('');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(apiClient.endpoints.auth.profile, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedUser = response.data.user;
            setMessage(response.data.message || 'Profile updated successfully');
            setFormData((prev) => ({ ...prev, current_password: '', new_password: '' }));
            localStorage.setItem('user', JSON.stringify(updatedUser));
            onUserUpdate?.(updatedUser);
            setTimeout(() => {
                setIsOpen(false);
                setMessage('');
            }, 700);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button type="button" className="btn btn-primary" onClick={openModal}>
                Change Profile
            </button>

            {isOpen && (
                <div className="profile-modal-backdrop" role="presentation">
                    <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
                        <div className="profile-modal-header">
                            <div>
                                <p className="section-kicker">{t('Profile')}</p>
                                <h2 id="profile-modal-title">Change Profile</h2>
                            </div>
                            <button type="button" className="profile-modal-close" onClick={closeModal} aria-label="Close profile form">
                                x
                            </button>
                        </div>

                        {message && <div className="success-message">{message}</div>}
                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleSubmit} className="profile-form">
                            <div className="profile-photo-row">
                                <span className={formData.profile_image ? 'profile-photo-preview has-image' : 'profile-photo-preview'}>
                                    {formData.profile_image ? (
                                        <img src={formData.profile_image} alt="Profile preview" />
                                    ) : (
                                        formData.full_name?.charAt(0) || 'A'
                                    )}
                                </span>
                                <div>
                                    <label className="btn btn-outline profile-upload-btn">
                                        Upload Photo
                                        <input type="file" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                    {formData.profile_image && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline"
                                            onClick={() => setFormData((prev) => ({ ...prev, profile_image: '' }))}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('Username')}</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('Email')}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('Phone')}</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{t('Current Password')}</label>
                                    <div className="profile-password-wrapper">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            name="current_password"
                                            value={formData.current_password}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            className="profile-toggle-password"
                                            onClick={() => setShowCurrentPassword((current) => !current)}
                                            aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                        >
                                            {showCurrentPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <small>Required when changing username, email, or password.</small>
                                </div>

                                <div className="form-group">
                                    <label>{t('New Password')}</label>
                                    <div className="profile-password-wrapper">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            name="new_password"
                                            value={formData.new_password}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            className="profile-toggle-password"
                                            onClick={() => setShowNewPassword((current) => !current)}
                                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                        >
                                            {showNewPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <small>{t('Leave blank if you do not want to change password')}</small>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    {t('Cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? t('Saving...') : t('Save Profile')}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
};

export default ProfileSettings;
