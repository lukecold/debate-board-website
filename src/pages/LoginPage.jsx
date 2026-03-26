import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userServiceClient } from '../lib/apollo';
import { REGISTER, LOGIN } from '../lib/userQueries';
import { languageOptions } from '../lib/languageOptions';

/** Turn Apollo / network errors into user-friendly messages */
function friendlyError(err, t) {
  // Network-level failures (HTTP 4xx/5xx, no connectivity, etc.)
  if (err.networkError) {
    const status = err.networkError.statusCode;
    if (status === 422 || status === 400) return t('login.errBadRequest');
    if (status === 429) return t('login.errTooMany');
    if (status >= 500) return t('login.errServer');
    return t('login.errNetwork');
  }
  // GraphQL-level errors — return the first message
  const gqlMsg = err.graphQLErrors?.[0]?.message;
  if (gqlMsg) {
    if (gqlMsg.includes('invalid credentials')) return t('login.errInvalidCredentials');
    if (gqlMsg.includes('not verified')) return t('login.errNotVerified');
    return gqlMsg;
  }
  return t('login.errUnknown');
}

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'sent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // devLink: activation URL returned by backend when SMTP is disabled
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [registerMutation, { loading: registering }] = useMutation(REGISTER, {
    client: userServiceClient,
    onCompleted: (data) => {
      setError('');
      const result = data.register;
      // "sent" → SMTP delivered the email; anything else is the URL (dev mode)
      setDevLink(result !== 'sent' ? result : '');
      setMode('sent');
    },
    onError: (err) => setError(friendlyError(err, t)),
  });

  const [loginMutation, { loading: loggingIn }] = useMutation(LOGIN, {
    client: userServiceClient,
    onCompleted: (data) => {
      login(data.login);
      navigate('/');
    },
    onError: (err) => setError(friendlyError(err, t)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);
    if (mode === 'login') {
      loginMutation({ variables: { email: trimmedEmail, password } });
    } else if (mode === 'register') {
      registerMutation({ variables: { email: trimmedEmail } });
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setDevLink('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-lang-toggle">
          <select
            className="btn-lang-toggle"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languageOptions.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
        <h1>{t('login.title')}</h1>
        <p className="login-subtitle">
          {mode === 'login' && t('login.signIn')}
          {mode === 'register' && t('login.createAccount')}
          {mode === 'sent' && t('login.checkEmail')}
        </p>

        {mode !== 'sent' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              {t('login.loginTab')}
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              {t('login.registerTab')}
            </button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        {mode === 'sent' ? (
          // ── Activation-link-sent confirmation ─────────────────────────────
          <div className="activation-sent">
            <div className="activation-icon">✉️</div>
            {devLink ? (
              <>
                <p className="activation-dev-label">{t('login.activationSentDev')}</p>
                <a
                  className="activation-dev-link"
                  href={devLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {devLink}
                </a>
              </>
            ) : (
              <>
                <p>
                  {t('login.activationSent')}{' '}
                  <strong>{email}</strong>.
                </p>
                <p className="activation-expiry">{t('login.activationExpiry')}</p>
              </>
            )}
            <button type="button" className="btn-link" onClick={() => switchMode('register')}>
              {t('login.backToRegister')}
            </button>
          </div>
        ) : (
          // ── Login / Register form ─────────────────────────────────────────
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            {/* Password is only needed for login; register only collects email here */}
            {mode === 'login' && (
              <div className="form-group">
                <label>{t('login.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={registering || loggingIn}
            >
              {mode === 'login'
                ? loggingIn ? t('login.signingIn') : t('login.signInBtn')
                : registering ? t('login.registering') : t('login.registerBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
