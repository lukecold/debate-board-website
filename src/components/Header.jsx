import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ja', label: '日本語' },
    { code: 'th', label: 'ภาษาไทย' },
  ];

  return (
    <header className="app-header">
      <div className="header-left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <h2>{t('header.title')}</h2>
      </div>
      <div className="header-right">
        <select
          className="btn-lang-toggle"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {languageOptions.map(({ code, label }) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>

        {/* Clickable username → user center */}
        <button
          className="header-user header-user-btn"
          onClick={() => user && navigate(`/user/${user.id}`)}
          title={t('header.viewProfile')}
        >
          {user?.alias}
          {user?.isAdmin && <span className="admin-badge">{t('header.admin')}</span>}
        </button>

        <button className="btn-secondary btn-small" onClick={handleLogout}>
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
}
