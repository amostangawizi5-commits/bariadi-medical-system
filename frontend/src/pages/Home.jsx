import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Home.css';
import { useLanguage } from '../i18n/LanguageContext';
import { apiClient } from '../config/apiConfig';

const Home = () => {
    const { t } = useLanguage();
    const [summary, setSummary] = useState({
        total_employees: 0,
        active: 0,
        pending: 0,
        expired: 0
    });

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await axios.get(apiClient.endpoints.reports.summary);
                setSummary(response.data.summary || {});
            } catch (error) {
                console.error('Error loading public certificate summary:', error);
            }
        };

        fetchSummary();
    }, []);

    const totalCertificates = Number(summary.total_employees) || 0;
    const activeCertificates = Number(summary.active) || 0;
    const expiringCertificates = Number(summary.pending) || 0;
    const activeProgress = totalCertificates > 0
        ? Math.min(100, Math.round((activeCertificates / totalCertificates) * 100))
        : 0;

    return (
        <div className="home-page">
            <main id="home" className="hero-section">
                <section className="hero-copy" aria-labelledby="home-title">
                    <p className="eyebrow">{t('Digital health certificates for public service')}</p>
                    <h1 id="home-title">
                        {t('Medical Certificate Management System')}
                    </h1>
                    <p className="hero-text">
                        A clean, secure system for registering patients, managing medical certificates,
                        tracking payments, and preparing health office reports.
                    </p>

                    <div className="hero-buttons">
                        <Link className="primary-cta" to="/login">
                            {t('Login to Continue')}
                        </Link>
                        <a className="secondary-cta" href="#services">View Services</a>
                    </div>

                    <div className="hero-trust-row" aria-label="Core service highlights">
                        <span>Secure access</span>
                        <span>District records</span>
                        <span>SMS reminders</span>
                    </div>
                </section>

                <section className="hero-art" aria-label="Medical certificate system preview">
                    <div className="portal-preview">
                        <div className="portal-topbar">
                            <span />
                            <strong>Afya Bariadi Portal</strong>
                            <em>Online</em>
                        </div>

                        <div className="portal-grid">
                            <div className="portal-main-panel">
                                <div className="portal-kicker">Certificate status</div>
                                <strong>Medical clearance verified</strong>
                                <div className="portal-progress">
                                    <span style={{ width: `${activeProgress}%` }} />
                                </div>
                                <div className="portal-meta-row">
                                    <span>{totalCertificates} total</span>
                                    <span>{activeCertificates} valid</span>
                                    <span>{expiringCertificates} expiring</span>
                                </div>
                            </div>

                            <div className="portal-side-panel">
                                <span className="portal-icon">+</span>
                                <strong>Health Office</strong>
                                <small>Bariadi District</small>
                            </div>

                            <div className="portal-stat">
                                <span>Active</span>
                                <strong>{activeCertificates}</strong>
                            </div>
                            <div className="portal-stat warning">
                                <span>Expiring</span>
                                <strong>{expiringCertificates}</strong>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <section id="services" className="service-band">
                <div className="service-item">
                    <span>01</span>
                    <strong>{t('Certificate Registration')}</strong>
                    <p>{t('Capture worker health certificate records with clear status tracking.')}</p>
                </div>
                <div className="service-item">
                    <span>02</span>
                    <strong>Employer Management</strong>
                    <p>Keep employer and workplace information organized for inspection workflows.</p>
                </div>
                <div className="service-item">
                    <span>03</span>
                    <strong>Reports and Payments</strong>
                    <p>Review payment activity and generate practical health office summaries.</p>
                </div>
            </section>

            <footer className="home-footer">
                <div className="footer-wave" aria-hidden="true">
                    <span className="wave wave-one" />
                    <span className="wave wave-two" />
                    <span className="wave wave-three" />
                </div>

                <div className="footer-content">
                    <div className="footer-grid">
                        <section className="footer-column">
                            <h2>{t('Contact Us')}</h2>
                            <p>District Medical Officer's Office,</p>
                            <p>Bariadi District Council,</p>
                            <p>P.O. Box 109, Bariadi - Simiyu.</p>
                            <p>Email: afya@bariadi.go.tz</p>
                            <p>Phone: 0741742627 / 0638932627</p>
                        </section>

                        <section className="footer-column footer-links">
                            <h2>{t('Useful Websites')}</h2>
                            <a href="https://www.tanzania.go.tz">President's Office</a>
                            <a href="https://www.pmo.go.tz">Prime Minister's Office</a>
                            <a href="https://www.moh.go.tz">Ministry of Health</a>
                            <a href="https://www.tamisemi.go.tz">PO-RALG</a>
                            <a href="https://www.utumishi.go.tz">Public Service Management</a>
                        </section>

                        <section className="footer-column footer-links">
                            <h2>{t('Online Services')}</h2>
                            <a href="#services">Health Certificate Registration</a>
                            <a href="#services">Expired Certificate Tracking</a>
                            <a href="#services">Employer Reports</a>
                            <a href="#services">Payments and Records</a>
                            <a href="#home">Bariadi Health System</a>
                        </section>
                    </div>

                    <div className="footer-support-row">
                        <section className="footer-support">
                            <h2>{t('Reach Our Team')}</h2>
                            <p>{t('Our support team is available 24 hours every day.')}</p>
                            <div className="support-phones">
                                <a href="tel:0741742627">0741742627</a>
                                <a href="tel:0638932627">0638932627</a>
                            </div>
                        </section>

                        <section className="footer-social">
                            <h2>{t('Connect With Us')}</h2>
                            <div className="social-links" aria-label="Social links">
                                <a href="#home" aria-label="Facebook">f</a>
                                <a href="#home" aria-label="X">X</a>
                                <a href="#home" aria-label="YouTube">▶</a>
                                <a href="#home" aria-label="Instagram">◎</a>
                            </div>
                        </section>
                    </div>

                    <div className="footer-bottom">
                        <nav aria-label="Footer navigation">
                            <a href="#contact">{t('Contact Us')}</a>
                            <a href="#home">{t('Site Map')}</a>
                            <a href="#privacy">{t('Privacy Policy')}</a>
                            <a href="#terms">{t('Terms and Conditions')}</a>
                        </nav>
                        <p>© 2026. {t('All rights reserved.')}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
