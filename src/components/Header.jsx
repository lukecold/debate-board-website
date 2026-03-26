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

  const { data: orgData } = useQuery(GET_MY_ORG, { client });
  const orgName = orgData?.myOrg?.name;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Badge logic: if admin + has org → show "Org Admin" badge, hover reveals both
  const role = user?.role;
  const isAdminWithOrg = (role === 'admin' || role === 'owner') && !!orgName;
  const displayBadge = isAdminWithOrg ? 'Org Admin' : roleBadgeLabel(role);
  const displayBadgeClass = isAdminWithOrg ? 'role-badge role-org-admin' : roleBadgeClass(role);
  const hoverTitle = isAdminWithOrg
    ? `${roleBadgeLabel(role)} · Org Admin`
    : roleBadgeLabel(role) || '';

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>{t('header.title')}</h2>
        {orgName && <span className="org-name-badge">{orgName}</span>}
      </div>
      <div className="header-right">
        <select
          className="btn-lang-toggle header-lang-desktop"
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
          {displayBadge && <span className={displayBadgeClass} title={hoverTitle}>{displayBadge}</span>}
        </button>

        <button className="btn-secondary btn-small" onClick={handleLogout}>
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
}
