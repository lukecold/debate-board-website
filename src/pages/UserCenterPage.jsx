import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { client, userServiceClient } from '../lib/apollo';
import { GET_USER_ACTIVITY } from '../lib/queries';
import {
  GET_PUBLIC_USER,
  GET_ALIAS_COOLDOWN,
  REQUEST_PASSWORD_CHANGE,
  CHANGE_ALIAS,
} from '../lib/userQueries';

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = {
    adopted: 'badge-adopted',
    rejected: 'badge-rejected',
    open: 'badge-open',
    pending_review: 'badge-pending',
  }[status] || 'badge-pending';
  return <span className={`uc-badge ${cls}`}>{status.replace('_', ' ')}</span>;
}

function VoteChip({ type }) {
  const up = type === 'UPVOTE' || type === 'for';
  return (
    <span className={`uc-vote-chip ${up ? 'chip-up' : 'chip-down'}`}>
      {up ? '▲' : '▼'} {type}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserCenterPage() {
  const { userID } = useParams();
  const navigate = useNavigate();
  const { user: me, login } = useAuth();
  const { t } = useLanguage();

  const isOwnProfile = me && me.id === userID;

  // Active tab: 'arguments' | 'proposals' | 'boards' | 'votes' | 'settings'
  const [tab, setTab] = useState('arguments');

  // ── Settings state ──────────────────────────────────────────────────────────
  const [aliasInput, setAliasInput] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [aliasSuccess, setAliasSuccess] = useState('');
  const [pwRequestSent, setPwRequestSent] = useState(false);
  const [pwRequestLink, setPwRequestLink] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: profileData, loading: profileLoading } = useQuery(GET_PUBLIC_USER, {
    client: userServiceClient,
    variables: { userID },
    skip: !userID,
  });

  const { data: activityData, loading: activityLoading } = useQuery(GET_USER_ACTIVITY, {
    client,
    variables: { userID },
    skip: !userID,
    fetchPolicy: 'network-only',
  });

  const { data: cooldownData, refetch: refetchCooldown } = useQuery(GET_ALIAS_COOLDOWN, {
    client: userServiceClient,
    skip: !isOwnProfile,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const [requestPasswordChange, { loading: requestingPw }] = useMutation(REQUEST_PASSWORD_CHANGE, {
    client: userServiceClient,
    onCompleted: (data) => {
      const result = data.requestPasswordChange;
      if (result !== 'sent') {
        setPwRequestLink(result); // dev mode
      }
      setPwRequestSent(true);
      setSettingsError('');
    },
    onError: (err) => setSettingsError(err.message),
  });

  const [changeAlias, { loading: changingAlias }] = useMutation(CHANGE_ALIAS, {
    client: userServiceClient,
    onCompleted: (data) => {
      const { newAlias } = data.changeAlias;
      setAliasSuccess(t('uc.aliasChanged') + ' ' + newAlias);
      setAliasError('');
      setAliasInput('');
      refetchCooldown();
      // Update stored user so the header alias refreshes.
      if (me) {
        login({ token: localStorage.getItem('authToken'), user: { ...me, alias: newAlias } });
      }
    },
    onError: (err) => {
      setAliasError(err.message);
      setAliasSuccess('');
    },
  });

  const handleAliasSubmit = (e) => {
    e.preventDefault();
    setAliasError('');
    setAliasSuccess('');
    changeAlias({ variables: { newAliasBase: aliasInput } });
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const profile = profileData?.getUser;
  const activity = activityData?.getUserActivity;
  const cooldownDays = cooldownData?.aliasChangeCooldown ?? 0;

  if (profileLoading) {
    return (
      <div className="uc-page">
        <div className="uc-loading">{t('uc.loading')}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="uc-page">
        <div className="uc-loading">{t('uc.notFound')}</div>
      </div>
    );
  }

  // Tabs available depend on role and ownership
  const tabs = [
    { key: 'arguments', label: t('uc.tabArguments') },
    { key: 'proposals', label: t('uc.tabProposals') },
    { key: 'votes', label: t('uc.tabVotes') },
    // Boards tab: show for everyone (boards from adopted proposals are public)
    { key: 'boards', label: t('uc.tabBoards') },
    // Settings tab: own profile only
    ...(isOwnProfile ? [{ key: 'settings', label: t('uc.tabSettings') }] : []),
  ];

  return (
    <div className="uc-page">
      {/* ── Profile header ────────────────────────────────────────────────── */}
      <div className="uc-profile-card">
        <div className="uc-avatar">{profile.alias.charAt(0).toUpperCase()}</div>
        <div className="uc-profile-info">
          <h2 className="uc-alias">
            {profile.alias}
            {profile.isAdmin && <span className="admin-badge">{t('header.admin')}</span>}
          </h2>
          <p className="uc-score">{t('uc.contributionScore')}: <strong>{profile.contributionScore}</strong></p>
          <p className="uc-joined">{t('uc.joined')}: {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="uc-tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`uc-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="uc-content">
        {activityLoading && <div className="uc-loading">{t('uc.loading')}</div>}

        {/* Arguments */}
        {tab === 'arguments' && !activityLoading && (
          <div className="uc-list">
            {(activity?.arguments ?? []).length === 0
              ? <p className="uc-empty">{t('uc.noArguments')}</p>
              : (activity.arguments).map((arg) => (
                <div key={arg.id} className="uc-item">
                  <p className="uc-item-content">{arg.content}</p>
                  <div className="uc-item-meta">
                    <span className="uc-votes">▲{arg.votes >= 0 ? '+' : ''}{arg.votes}</span>
                    <span className="uc-date">{new Date(arg.createdAt).toLocaleDateString()}</span>
                    {arg.parentArgumentID == null && (
                      <span className="uc-tag">{t('uc.topLevel')}</span>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Proposals */}
        {tab === 'proposals' && !activityLoading && (
          <div className="uc-list">
            {(activity?.proposals ?? []).length === 0
              ? <p className="uc-empty">{t('uc.noProposals')}</p>
              : (activity.proposals).map((p) => (
                <div key={p.id} className="uc-item">
                  <div className="uc-item-row">
                    <strong className="uc-item-title">{p.title}</strong>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="uc-item-content">{p.description}</p>
                  <div className="uc-item-meta">
                    <span>▲{p.votesFor} / ▼{p.votesAgainst}</span>
                    {p.createdDebateBoardID && (
                      <Link className="uc-link" to={`/board/${p.createdDebateBoardID}`}>
                        {t('uc.viewBoard')} →
                      </Link>
                    )}
                    <span className="uc-date">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Boards (from adopted proposals) */}
        {tab === 'boards' && !activityLoading && (
          <div className="uc-list">
            {(activity?.boards ?? []).length === 0
              ? <p className="uc-empty">{t('uc.noBoards')}</p>
              : (activity.boards).map((b) => (
                <div
                  key={b.debateBoardID}
                  className="uc-item uc-item-clickable"
                  onClick={() => navigate(`/board/${b.debateBoardID}`)}
                >
                  <div className="uc-item-row">
                    <strong className="uc-item-title">{b.title}</strong>
                    {b.features.slice(0, 3).map((f) => (
                      <span key={f} className="uc-tag">{f}</span>
                    ))}
                  </div>
                  <p className="uc-item-content uc-item-truncate">{b.content}</p>
                  <span className="uc-date">{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* Votes */}
        {tab === 'votes' && !activityLoading && (
          <div className="uc-votes-section">
            <h3>{t('uc.argumentVotes')}</h3>
            <div className="uc-list">
              {(activity?.argumentVotes ?? []).length === 0
                ? <p className="uc-empty">{t('uc.noVotes')}</p>
                : (activity.argumentVotes).map((v, i) => (
                  <div key={i} className="uc-item uc-item-row">
                    <VoteChip type={v.voteType} />
                    <span className="uc-item-id">#{v.argumentID.slice(0, 8)}</span>
                    <span className="uc-date">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
            <h3 className="uc-section-title">{t('uc.proposalVotes')}</h3>
            <div className="uc-list">
              {(activity?.proposalVotes ?? []).length === 0
                ? <p className="uc-empty">{t('uc.noVotes')}</p>
                : (activity.proposalVotes).map((v, i) => (
                  <div key={i} className="uc-item uc-item-row">
                    <VoteChip type={v.voteType} />
                    <span className="uc-item-id">#{v.proposalID.slice(0, 8)}</span>
                    <span className="uc-date">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Settings (own profile only) */}
        {tab === 'settings' && isOwnProfile && (
          <div className="uc-settings">

            {/* ── Password change ─────────────────────────────────────── */}
            <section className="uc-settings-section">
              <h3>{t('uc.changePassword')}</h3>
              <p className="uc-settings-desc">{t('uc.changePasswordDesc')}</p>
              {settingsError && <div className="auth-error">{settingsError}</div>}
              {pwRequestSent ? (
                <div className="activation-sent">
                  <div className="activation-icon">✉️</div>
                  {pwRequestLink ? (
                    <>
                      <p className="activation-dev-label">{t('login.activationSentDev')}</p>
                      <a className="activation-dev-link" href={pwRequestLink}
                        target="_blank" rel="noopener noreferrer">{pwRequestLink}</a>
                    </>
                  ) : (
                    <p>{t('uc.passwordLinkSent')}</p>
                  )}
                  <button className="btn-link" onClick={() => { setPwRequestSent(false); setPwRequestLink(''); }}>
                    {t('uc.sendAgain')}
                  </button>
                </div>
              ) : (
                <button
                  className="btn-primary uc-settings-btn"
                  disabled={requestingPw}
                  onClick={() => requestPasswordChange()}
                >
                  {requestingPw ? t('uc.sending') : t('uc.sendPasswordLink')}
                </button>
              )}
            </section>

            {/* ── Alias change ─────────────────────────────────────────── */}
            <section className="uc-settings-section">
              <h3>{t('uc.changeAlias')}</h3>
              <p className="uc-settings-desc">{t('uc.changeAliasDesc')}</p>
              {cooldownDays > 0 ? (
                <p className="uc-cooldown">
                  🕐 {t('uc.aliasCooldown').replace('{days}', cooldownDays)}
                </p>
              ) : (
                <form className="uc-alias-form" onSubmit={handleAliasSubmit}>
                  {aliasError && <div className="auth-error">{aliasError}</div>}
                  {aliasSuccess && <div className="uc-success">{aliasSuccess}</div>}
                  <div className="form-group">
                    <label>{t('login.alias')}</label>
                    <div className="alias-input-wrap">
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        placeholder={t('login.aliasPlaceholder')}
                        required
                        minLength={2}
                        maxLength={100}
                        pattern="[a-zA-Z0-9_\-]+"
                      />
                      <span className="alias-suffix-preview">
                        {aliasInput ? `${aliasInput}#xxxx` : '#xxxx'}
                      </span>
                    </div>
                    <p className="form-hint">{t('login.aliasSuffixHint')}</p>
                  </div>
                  <button type="submit" className="btn-primary uc-settings-btn" disabled={changingAlias}>
                    {changingAlias ? t('uc.saving') : t('uc.saveAlias')}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
