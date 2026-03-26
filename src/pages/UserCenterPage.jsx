import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { languageOptions } from '../lib/languageOptions';
import { client, userServiceClient } from '../lib/apollo';
import { GET_USER_ACTIVITY, GET_MY_OCTAGON_INVITES, RESPOND_TO_OCTAGON_INVITE, GET_MY_ORG, UPDATE_ORG_SETTINGS } from '../lib/queries';
import { isAdminRole } from '../lib/roles';
import {
  GET_PUBLIC_USER,
  GET_ALIAS_COOLDOWN,
  REQUEST_PASSWORD_CHANGE,
  CHANGE_ALIAS,
  UPDATE_AVATAR,
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
  const { t, language, setLanguage } = useLanguage();

  const isOwnProfile = me && me.id === userID;

  // Active tab: 'arguments' | 'proposals' | 'boards' | 'votes' | 'invites' | 'settings'
  const [tab, setTab] = useState('arguments');

  // ── Settings state ──────────────────────────────────────────────────────────
  const [aliasInput, setAliasInput] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [aliasSuccess, setAliasSuccess] = useState('');
  const [pwRequestSent, setPwRequestSent] = useState(false);
  const [pwRequestLink, setPwRequestLink] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');

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

  const { data: invitesData, refetch: refetchInvites } = useQuery(GET_MY_OCTAGON_INVITES, {
    client,
    skip: !isOwnProfile,
    fetchPolicy: 'network-only',
  });

  // Org settings (own profile, admin roles only)
  const { data: orgData, refetch: refetchOrg } = useQuery(GET_MY_ORG, {
    client,
    skip: !isOwnProfile,
  });
  const [updateOrgSettings, { loading: updatingOrg }] = useMutation(UPDATE_ORG_SETTINGS, { client });
  const [orgNameInput, setOrgNameInput] = useState('');
  const [orgNameDirty, setOrgNameDirty] = useState(false);

  // Sync avatar URL input when user data loads
  useEffect(() => {
    if (me?.avatarUrl && !avatarUrlInput) {
      setAvatarUrlInput(me.avatarUrl);
    }
  }, [me?.avatarUrl]);

  // Sync org name input when data loads
  useEffect(() => {
    if (orgData?.myOrg?.name && !orgNameDirty) {
      setOrgNameInput(orgData.myOrg.name);
    }
  }, [orgData?.myOrg?.name, orgNameDirty]);

  const [respondToOctagonInvite] = useMutation(RESPOND_TO_OCTAGON_INVITE, {
    client,
    onCompleted: () => refetchInvites(),
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

  const [updateAvatar, { loading: updatingAvatar }] = useMutation(UPDATE_AVATAR, {
    client: userServiceClient,
    onCompleted: (data) => {
      const updatedUser = data.updateAvatar;
      setAvatarSuccess('Avatar updated successfully');
      setAvatarError('');
      // Update auth state so avatar persists across the app
      login({ token: localStorage.getItem('authToken'), user: { ...me, ...updatedUser } });
    },
    onError: (err) => {
      setAvatarError(err.message);
      setAvatarSuccess('');
    },
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
    // Invites tab: own profile only
    ...(isOwnProfile ? [{ key: 'invites', label: t('uc.octagonInvites') }] : []),
    // Settings tab: own profile only
    ...(isOwnProfile ? [{ key: 'settings', label: t('uc.tabSettings') }] : []),
    // Org tab: own profile only, when user has an org
    ...(isOwnProfile && orgData?.myOrg ? [{ key: 'org', label: t('uc.tabOrg') }] : []),
  ];

  return (
    <div className="uc-page">
      {/* ── Profile header ────────────────────────────────────────────────── */}
      <div className="uc-profile-card">
        <div className="uc-avatar">
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile.alias} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : profile.alias.charAt(0).toUpperCase()}
        </div>
        <div className="uc-profile-info">
          <h2 className="uc-alias">
            {profile.alias}
            {profile.role && profile.role !== 'user' && (
              <span className={`role-badge role-${profile.role === 'org_admin' ? 'org-admin' : profile.role}`}>
                {profile.role === 'owner' ? 'Owner' : profile.role === 'admin' ? 'Admin' : profile.role === 'org_admin' ? 'Org Admin' : ''}
              </span>
            )}
          </h2>
          <p className="uc-score">{t('uc.contributionScore')}: <strong>{profile.contributionScore}</strong></p>
          {(profile.battlePoints > 0 || isOwnProfile) && (
            <p className="uc-score">{t('uc.battlePoints')}: <strong>{profile.battlePoints ?? 0}</strong></p>
          )}
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

        {/* Boards (from adopted proposals + directly created) */}
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
                  <div
                    key={i}
                    className="uc-item uc-item-row uc-item-clickable"
                    onClick={() => navigate(`/board/${v.debateBoardID}`)}
                  >
                    <VoteChip type={v.voteType} />
                    <span className="uc-item-argument-content">{v.argumentContent}</span>
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
                    <span className="uc-item-argument-content">{v.proposalTitle}</span>
                    <span className="uc-date">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* OCTAGON! Invites (own profile only) */}
        {tab === 'invites' && isOwnProfile && (
          <div className="uc-list">
            {(invitesData?.myOctagonInvites ?? []).length === 0
              ? <p className="uc-empty">{t('uc.noInvites')}</p>
              : (invitesData.myOctagonInvites).map((inv) => (
                <div key={inv.octagonID} className="uc-item">
                  <div className="uc-item-row">
                    <strong className="uc-item-title">
                      <span className="mode-badge-octagon">OCTAGON!</span>{' '}
                      <Link to={`/board/${inv.boardID}`}>{inv.boardTitle}</Link>
                    </strong>
                  </div>
                  <div className="uc-item-meta">
                    <button
                      className="btn-octagon"
                      onClick={() => respondToOctagonInvite({ variables: { boardID: inv.boardID, accept: true } })}
                    >
                      {t('uc.accept')}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ marginLeft: '8px' }}
                      onClick={() => respondToOctagonInvite({ variables: { boardID: inv.boardID, accept: false } })}
                    >
                      {t('uc.decline')}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Settings (own profile only) */}
        {tab === 'settings' && isOwnProfile && (
          <div className="uc-settings">

            {/* ── Language ────────────────────────────────────────────── */}
            <section className="uc-settings-section">
              <h3>{t('uc.language')}</h3>
              <select
                className="btn-lang-toggle"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languageOptions.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </section>

            {/* ── Avatar ───────────────────────────────────────────────── */}
            <section className="uc-settings-section">
              <h3>Avatar</h3>
              <p className="uc-settings-desc">Set a URL for your profile avatar image.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div className="uc-avatar" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0 }}>
                  {avatarUrlInput
                    ? <img src={avatarUrlInput} alt="avatar preview" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : me?.alias?.charAt(0).toUpperCase()}
                </div>
              </div>
              {avatarError && <div className="auth-error">{avatarError}</div>}
              {avatarSuccess && <div className="uc-success">{avatarSuccess}</div>}
              <div className="form-group">
                <label>Avatar URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={avatarUrlInput}
                  onChange={(e) => { setAvatarUrlInput(e.target.value); setAvatarSuccess(''); setAvatarError(''); }}
                  placeholder="https://example.com/avatar.png"
                  style={{ width: '100%' }}
                />
              </div>
              <button
                className="btn-primary uc-settings-btn"
                disabled={updatingAvatar || !avatarUrlInput}
                onClick={() => updateAvatar({ variables: { avatarUrl: avatarUrlInput } })}
              >
                {updatingAvatar ? t('uc.saving') : t('uc.save')}
              </button>
            </section>

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
        {/* Org Settings */}
        {tab === 'org' && isOwnProfile && orgData?.myOrg && (() => {
          const org = orgData.myOrg;
          const handleOrgToggle = async (field, currentValue) => {
            await updateOrgSettings({ variables: { [field]: !currentValue } });
            refetchOrg();
          };
          const handleOrgNameSave = async () => {
            await updateOrgSettings({ variables: { name: orgNameInput } });
            setOrgNameDirty(false);
            refetchOrg();
          };
          return (
            <div className="cc-settings">
              <div className="cc-domain">
                <span className="cc-domain-label">{t('controlCenter.orgDomain')}</span>
                <span className="cc-domain-value">{org.emailDomain}</span>
              </div>

              <div className="cc-setting-card">
                <div className="cc-setting-header">
                  <div className="cc-setting-text">
                    <h3>{t('controlCenter.orgName')}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={orgNameInput}
                      onChange={(e) => { setOrgNameInput(e.target.value); setOrgNameDirty(true); }}
                      style={{ width: '200px' }}
                    />
                    <button
                      className="btn-primary btn-small"
                      onClick={handleOrgNameSave}
                      disabled={updatingOrg || !orgNameDirty}
                    >
                      {t('uc.save')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="cc-setting-card">
                <div className="cc-setting-header">
                  <div className="cc-setting-text">
                    <h3>{t('controlCenter.exposeToPublic')}</h3>
                    <p>{t('controlCenter.exposeToPublicDesc')}</p>
                  </div>
                  <label className="cc-toggle">
                    <input
                      type="checkbox"
                      checked={org.exposeToPublic}
                      onChange={() => handleOrgToggle('exposeToPublic', org.exposeToPublic)}
                      disabled={updatingOrg}
                    />
                    <span className="cc-toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="cc-setting-card">
                <div className="cc-setting-header">
                  <div className="cc-setting-text">
                    <h3>{t('controlCenter.showPublicToOrg')}</h3>
                    <p>{t('controlCenter.showPublicToOrgDesc')}</p>
                  </div>
                  <label className="cc-toggle">
                    <input
                      type="checkbox"
                      checked={org.showPublicToOrg}
                      onChange={() => handleOrgToggle('showPublicToOrg', org.showPublicToOrg)}
                      disabled={updatingOrg}
                    />
                    <span className="cc-toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
