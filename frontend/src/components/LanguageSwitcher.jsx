import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const LanguageSwitcher = () => {
    const { language, setLanguage, t } = useLanguage();
    const nextLanguage = language === 'en' ? 'sw' : 'en';
    const label = language === 'en' ? 'Swahili' : 'English';

    return (
        <button
            type="button"
            aria-label={t('Language')}
            title={label}
            className="language-switcher-btn"
            onClick={() => setLanguage(nextLanguage)}
        >
            🌐
        </button>
    );
};

export default LanguageSwitcher;
