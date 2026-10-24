import { Response, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'token';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side scripts from reading the token (XSS protection)
    secure: isProduction, // Transmitted only over HTTPS in production
    sameSite: isProduction ? 'none' : 'lax', // CSRF mitigation: lax for same-site, none for cross-site prod if needed
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

/**
 * Clears the authentication cookie on logout.
 * Note: Clearing the cookie removes the token from the client browser.
 * In a stateless JWT architecture, any previously copied token remains valid
 * until expiration unless tracked in a server-side revocation blacklist.
 */
export const clearAuthCookie = (res: Response): void => {
  const { maxAge: _, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
};
