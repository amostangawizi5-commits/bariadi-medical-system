import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo from './logo.png';
import '../styles/SystemHeader.css';
import { useLanguage } from '../i18n/LanguageContext';

const SystemHeader = () => {
    const isAuthenticated = Boolean(localStorage.getItem('token'));
    const location = useLocation();
    const isSystemPage = location.pathname.startsWith('/admin');
    const [logoutNotice, setLogoutNotice] = useState(false);

    const { t } = useLanguage();

    useEffect(() => {
        if (sessionStorage.getItem('logout_success') !== 'true') {
            return undefined;
        }

        sessionStorage.removeItem('logout_success');
        setLogoutNotice(true);

        const timer = window.setTimeout(() => {
            setLogoutNotice(false);
        }, 2200);

        return () => window.clearTimeout(timer);
    }, [location.key]);

    return (
        <header className="system-header">
            <Link to="/" className="system-brand" aria-label="Afya Bariadi home">
                <img src={logo} alt={t('THE UNITED REPUBLIC OF TANZANIA')} />
                <span>
                    <strong>AFYA</strong>
                    <small>Bariadi</small>
                </span>
            </Link>

            <div className="system-title">
                <strong>{t('THE UNITED REPUBLIC OF TANZANIA')}</strong>
                <span>{t('MEDICAL CERTIFICATE SYSTEM')}</span>
            </div>

            <nav className="system-nav" aria-label="System navigation">
                {!isSystemPage && (
                    <>
                        <NavLink to="/" end>{t('Home')}</NavLink>
                        <a href="/#services">{t('Services')}</a>
                    </>
                )}

                <NavLink to={isSystemPage && isAuthenticated ? '/logout' : '/login'} className="system-login-link">
                    {isSystemPage && isAuthenticated ? t('Log Out') : t('Log In')}
                </NavLink>
            </nav>

            {logoutNotice && (
                <div className="logout-toast" role="status" aria-live="polite">
                    <strong>Logout successfully</strong>
                    <span>You have been signed out safely.</span>
                    <i aria-hidden="true" onAnimationEnd={() => setLogoutNotice(false)} />
                </div>
            )}
        </header>
    );
};

export default SystemHeader;
