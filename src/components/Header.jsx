import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { languageOptions } from '../lib/languageOptions';
import { roleBadgeLabel, roleBadgeClass } from '../lib/roles';
import { client } from '../lib/apollo';
import { GET_MY_ORG } from '../lib/queries';

export default function Header() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  // Show org badge for users whose email domain has an org
  // (admin role users are platform admins, not org members)
  const isPlatformAdmin = user?.role === 'admin' || user?.role === 'owner';
  const { data: orgData } = useQuery(GET_MY_ORG, { client, skip: isPlatformAdmin });
  const orgName = !isPlatformAdmin ? orgData?.myOrg?.name : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const badge = roleBadgeLabel(user?.role);

  return (
    <header className="app-header">
      <div className="header-left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <h2>{t('header.title')}</h2>
        {orgName && <span className="org-name-badge">{orgName}</span>}
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
          {badge && <span className={roleBadgeClass(user?.role)}>{badge}</span>}
        </button>

        <button className="btn-secondary btn-small" onClick={handleLogout}>
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
}
