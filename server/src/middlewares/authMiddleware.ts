import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { AUTH_COOKIE_NAME, TokenPayload } from '../utils/token';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Primary authentication via HTTP-only cookie
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // 2. Secondary authentication via Authorization: Bearer <token> header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please sign in to access this portal.', 401);
    }

    // 3. Verify token validity and signature
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    // 4. Verify user still exists in database
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      throw new AppError('The user session belongs to an account that no longer exists.', 401);
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid authentication token. Please sign in again.', 401));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Session expired. Please sign in again to continue.', 401));
      return;
    }
    next(error);
  }
};
