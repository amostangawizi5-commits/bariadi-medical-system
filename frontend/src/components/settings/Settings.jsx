import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProfileSettings from './ProfileSettings';
import { apiClient } from '../../config/apiConfig';

const defaultSettings = {
    sms_30_days: true,
    sms_14_days: true,
    sms_7_days: true,
    sms_expired: true,
    sms_overdue: true,
    certificate_validity: 6
};

const parseSettings = (settings) => ({
    sms_30_days: settings.sms_30_days === true || settings.sms_30_days === 'true',
    sms_14_days: settings.sms_14_days === true || settings.sms_14_days === 'true',
    sms_7_days: settings.sms_7_days === true || settings.sms_7_days === 'true',
    sms_expired: settings.sms_expired === true || settings.sms_expired === 'true',
    sms_overdue: settings.sms_overdue === true || settings.sms_overdue === 'true',
    certificate_validity: Number(settings.certificate_validity) || defaultSettings.certificate_validity
});

const Settings = ({ user, onUserUpdate }) => {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const smsOptions = [
        {
            name: 'sms_30_days',
            title: '30-day reminder',
            label: 'Send SMS 30 days before',
            description: 'Notify the patient well before the certificate expires.',
            badge: '30 days'
        },
        {
            name: 'sms_14_days',
            title: '14-day reminder',
            label: 'Send SMS 14 days before',
            description: 'A mid reminder for patients who have not renewed.',
            badge: '14 days'
        },
        {
            name: 'sms_7_days',
            title: '7-day reminder',
            label: 'Send SMS 7 days before',
            description: 'Final warning before the certificate expires.',
            badge: '7 days'
        },
        {
            name: 'sms_expired',
            title: 'Expiry day alert',
            label: 'Send SMS on expiry day',
            description: 'Notify when a certificate has expired so actions can be taken.',
            badge: 'Expiry'
        },
        {
            name: 'sms_overdue',
            title: 'Overdue follow-up',
            label: 'Send SMS 7 days after expiry',
            description: 'Follow-up for patients whose certificates have lapsed.',
            badge: 'Overdue'
        }
    ];

    const activeSmsCount = smsOptions.filter((option) => settings[option.name]).length;

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get(apiClient.endpoints.settings.list);
                setSettings(parseSettings(response.data.settings || defaultSettings));
            } catch (err) {
                setError(err.response?.data?.message || 'Could not load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'checkbox' ? checked : Number(value)
        });
        setMessage('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const response = await axios.put(apiClient.endpoints.settings.update, settings);
            setSettings(parseSettings(response.data.settings || settings));
            setMessage(response.data.message || 'Settings saved successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings">
            <div className="page-header">
                <div>
                    <p className="section-kicker">System configuration</p>
                    <h1>Settings</h1>
                </div>
                <ProfileSettings user={user} onUserUpdate={onUserUpdate} />
            </div>

            <form onSubmit={handleSubmit} className="settings-layout">
                <section className="settings-panel">
                    {message && <div className="success-message settings-message">{message}</div>}
                    {error && <div className="error-message settings-message">{error}</div>}
                    <div className="settings-panel-header">
                        <div>
                            <p className="section-kicker">SMS automation</p>
                            <h2>SMS Settings</h2>
                            <span>{loading ? 'Loading saved settings...' : 'Choose which reminders will be sent to patients before or after certificate expiry.'}</span>
                        </div>
                        <div className="settings-status-card">
                            <strong>{activeSmsCount}/{smsOptions.length}</strong>
                            <span>active reminders</span>
                        </div>
                    </div>

                    <div className="sms-settings-grid">
                        {smsOptions.map((option) => (
                            <label className="sms-setting-card" key={option.name}>
                                <input
                                    type="checkbox"
                                    name={option.name}
                                    checked={settings[option.name]}
                                    onChange={handleChange}
                                />
                                <span className="sms-toggle" aria-hidden="true" />
                                <span className="sms-setting-copy">
                                    <span className="sms-setting-topline">
                                        <strong>{option.label}</strong>
                                        <em>{option.badge}</em>
                                    </span>
                                    <small>{option.description}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                <aside className="settings-side-panel">
                        <div className="settings-side-header">
                        <p className="section-kicker">Certificate rules</p>
                        <h2>Certificate Settings</h2>
                    </div>
                    <div className="form-group">
                        <label>Certificate validity (months)</label>
                        <div className="validity-control">
                            <input
                                type="number"
                                min="1"
                                max="60"
                                name="certificate_validity"
                                value={settings.certificate_validity}
                                onChange={handleChange}
                                className="form-input"
                            />
                            <span>months</span>
                        </div>
                    </div>

                    <div className="settings-preview">
                        <span className="preview-icon">SMS</span>
                        <div>
                            <strong>Reminder workflow</strong>
                            <p>SMS reminders will use the patient phone number saved during certificate registration.</p>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary settings-save-btn">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </aside>
            </form>
        </div>
    );
};

export default Settings;
