import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userServiceClient } from '../lib/apollo';
import { COMPLETE_REGISTRATION } from '../lib/userQueries';

/**
 * ActivatePage — handles /activate?token=<token>
 *
 * Flow:
 *  1. Page loads, reads ?token from URL, validates it (non-empty).
 *  2. Shows a registration-completion form:
 *     - Email address: pre-filled from the token (read-only — fetched after submit
 *       and shown in success message; we don't expose email before submit for privacy).
 *       Actually we cannot read the email client-side before calling the mutation,
 *       so we just show the form without a pre-filled email and the server returns it.
 *       We DO show a note "Completing registration for the email address in the link."
 *  3. User types alias + password, submits.
 *  4. completeRegistration mutation runs → logs user in → redirect to /.
 *
 * Note on "email read-only": the email is embedded in the token server-side; we
 * don't send it separately. Once completeRegistration succeeds the returned user
 * object contains the email, which is displayed briefly before the redirect.
 */
export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const token = searchParams.get('token') || '';

  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [status, setStatus] = useState(token ? 'form' : 'bad-link'); // 'form' | 'success' | 'bad-link'
  const [successEmail, setSuccessEmail] = useState('');

  const [completeRegistration, { loading }] = useMutation(COMPLETE_REGISTRATION, {
    client: userServiceClient,
    onCompleted: (data) => {
      const payload = data.completeRegistration;
      setSuccessEmail(payload.user.email);
      setStatus('success');
      login(payload);
      setTimeout(() => navigate('/'), 1800);
    },
    onError: (err) => {
      setLocalError(err.message || t('login.activateError'));
    },
  });

  // If no token in URL at all, show error immediately.
  useEffect(() => {
    if (!token) setStatus('bad-link');
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError(t('login.passwordMismatch'));
      return;
    }

    completeRegistration({ variables: { token, alias, password } });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{t('login.title')}</h1>

        {status === 'bad-link' && (
          <>
            <p className="auth-error">{t('login.activateError')}</p>
            <button type="button" className="btn-link" onClick={() => navigate('/login')}>
              {t('login.backToRegister')}
            </button>
          </>
        )}

        {status === 'success' && (
          <p className="login-subtitle activation-success">
            ✅ {t('login.activateSuccess')}
            {successEmail && <span> ({successEmail})</span>}
          </p>
        )}

        {status === 'form' && (
          <>
            <p className="login-subtitle">{t('login.completeRegistration')}</p>

            {localError && <div className="auth-error">{localError}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {/* Alias */}
              <div className="form-group">
                <label>{t('login.alias')}</label>
                <div className="alias-input-wrap">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder={t('login.aliasPlaceholder')}
                    required
                    minLength={2}
                    maxLength={100}
                    pattern="[a-zA-Z0-9_\-]+"
                    autoFocus
                  />
                  <span className="alias-suffix-preview">
                    {alias ? `${alias}#xxxx` : '#xxxx'}
                  </span>
                </div>
                <p className="form-hint">{t('login.aliasSuffixHint')}</p>
              </div>

              {/* Password */}
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

              {/* Confirm password */}
              <div className="form-group">
                <label>{t('login.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t('login.activating') : t('login.completeBtn')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
