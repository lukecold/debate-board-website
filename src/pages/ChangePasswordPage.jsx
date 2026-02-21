import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { userServiceClient } from '../lib/apollo';
import { CHANGE_PASSWORD } from '../lib/userQueries';

/**
 * ChangePasswordPage — handles /change-password?token=<token>
 * User arrives here via the password-change email link, enters new password twice, submits.
 */
export default function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [done, setDone] = useState(false);

  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD, {
    client: userServiceClient,
    onCompleted: () => {
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (err) => setLocalError(err.message || t('login.activateError')),
  });

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>{t('login.title')}</h1>
          <p className="auth-error">{t('uc.invalidPasswordLink')}</p>
          <button className="btn-link" onClick={() => navigate('/login')}>{t('login.backToRegister')}</button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirm) {
      setLocalError(t('login.passwordMismatch'));
      return;
    }
    changePassword({ variables: { token, newPassword: password } });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{t('login.title')}</h1>
        <p className="login-subtitle">{t('uc.setNewPassword')}</p>

        {done ? (
          <p className="login-subtitle activation-success">✅ {t('uc.passwordChanged')}</p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {localError && <div className="auth-error">{localError}</div>}
            <div className="form-group">
              <label>{t('login.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>{t('login.confirmPassword')}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t('uc.saving') : t('uc.savePassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
