import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'ht', label: 'HT', flag: '🇭🇹', name: 'Kreyòl' },
    { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français' },
    { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English' },
  ];

  const currentLang = i18n.language || 'ht';

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('plusgroup-lang', langCode);
    // Force reload to ensure all components update
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18
     }}>
      <Globe size={16} style={{ color: '#C9A84C' }} />
      <div style={{ display: 'flex', gap: 16 }}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: currentLang === lang.code 
                ? '2px solid #C9A84C' 
                : '1px solid rgba(255,255,255,0.1)',
              background: currentLang === lang.code
                ? 'linear-gradient(135deg, #C9A84C, #8B6914)'
                : 'rgba(255,255,255,0.05)',
              color: currentLang === lang.code ? '#0A0A0F' : '#fff',
              fontSize: 11,
              fontWeight: currentLang === lang.code ? 800 : 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              if (currentLang !== lang.code) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentLang !== lang.code) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }
            }}
          >
            {lang.flag} {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;