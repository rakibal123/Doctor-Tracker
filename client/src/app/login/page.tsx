'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/layout/Icons';
import { ApiError } from '../../lib/api';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, networkError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Enter your email address.';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, password });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          setFieldErrors(error.errors);
        }
        setGeneralError(error.message);
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="lg">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span className="spin" style={{ width: 24, height: 24, color: 'var(--pr)' }} />
          <span className="mut sm">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="lg">
      <div className="lc">
        <div className="brand" style={{ justifyContent: 'center', fontSize: 20 }}>
          <span className="logo" aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
          Doctor Tracker
        </div>

        <div className="card pad" style={{ padding: 26 }}>
          <h1 style={{ fontSize: 20 }}>Sign in</h1>
          <p className="mut" style={{ margin: '4px 0 20px' }}>
            Administrator access for your organization.
          </p>

          {/* Error Alert Banner */}
          {(generalError || networkError) && (
            <div className="alert" role="alert">
              <Icon name="alert" />
              <span>{generalError || networkError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="row">
              <label className="fl" htmlFor="f_email">
                Email
              </label>
              <input
                className={`inp ${fieldErrors.email ? 'bad' : ''}`}
                id="f_email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                autoComplete="username"
                placeholder="you@hospital.com"
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <div className="er" role="alert">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="row">
              <label className="fl" htmlFor="f_password">
                Password
              </label>
              <div className="pw">
                <input
                  className={`inp ${fieldErrors.password ? 'bad' : ''}`}
                  id="f_password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <Icon name="eye" />
                </button>
              </div>
              {fieldErrors.password && (
                <div className="er" role="alert">
                  {fieldErrors.password}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn p"
              style={{ width: '100%', minHeight: 44, marginTop: 6 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spin" aria-hidden="true" style={{ marginRight: 8 }} />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="note">
            <Icon name="shield" size={16} />
            <span>Secure access for authorized staff.</span>
          </div>

          {/* Development Testing Credentials (Excluded from Production Builds) */}
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                marginTop: 18,
                padding: '12px 14px',
                borderRadius: 'var(--r)',
                background: 'var(--sub)',
                border: '1px dashed var(--bd)',
                fontSize: 12.5,
                color: 'var(--mu)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--tx)',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="shield" size={14} />
                <span>Demo Admin Credentials — Testing Only</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '3px 10px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 12,
                }}
              >
                <span>Email:</span>
                <span style={{ color: 'var(--tx)', userSelect: 'all' }}>admin@doctortracker.com</span>
                <span>Password:</span>
                <span style={{ color: 'var(--tx)', userSelect: 'all' }}>password123</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
