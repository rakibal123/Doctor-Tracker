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
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const handleFillDemo = () => {
    setEmail('admin@doctortracker.com');
    setPassword('password123');
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleCopy = async (text: string, field: 'email' | 'password') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      }
    } catch {
      // Ignore clipboard write errors
    }
  };

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

          {/* Admin Credentials Hint Box */}
          <div
            style={{
              marginTop: 20,
              padding: '14px 16px',
              borderRadius: 'var(--r)',
              background: 'var(--sub)',
              border: '1px solid var(--bd)',
              fontSize: 13,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  color: 'var(--tx)',
                  fontSize: 12.5,
                }}
              >
                <Icon name="shield" size={14} />
                <span>Demo Admin Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  background: 'var(--pr)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                title="Auto-fill login credentials into form"
              >
                ⚡ Quick Fill
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '8px 10px',
                alignItems: 'center',
                background: 'var(--card)',
                padding: '10px 12px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--bd)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--mu)', fontWeight: 500 }}>Email:</span>
              <span
                style={{
                  color: 'var(--tx)',
                  fontWeight: 600,
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                admin@doctortracker.com
              </span>
              <button
                type="button"
                onClick={() => handleCopy('admin@doctortracker.com', 'email')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--bd)',
                  cursor: 'pointer',
                  color: copiedField === 'email' ? 'var(--pr)' : 'var(--mu)',
                  fontSize: 11,
                  fontWeight: copiedField === 'email' ? 600 : 500,
                  padding: '2px 8px',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Copy email"
              >
                {copiedField === 'email' ? '✓ Copied' : 'Copy'}
              </button>

              <span style={{ color: 'var(--mu)', fontWeight: 500 }}>Password:</span>
              <span
                style={{
                  color: 'var(--tx)',
                  fontWeight: 600,
                  userSelect: 'all',
                }}
              >
                password123
              </span>
              <button
                type="button"
                onClick={() => handleCopy('password123', 'password')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--bd)',
                  cursor: 'pointer',
                  color: copiedField === 'password' ? 'var(--pr)' : 'var(--mu)',
                  fontSize: 11,
                  fontWeight: copiedField === 'password' ? 600 : 500,
                  padding: '2px 8px',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title="Copy password"
              >
                {copiedField === 'password' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
