import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'An unexpected internal server error occurred';
  let errors: Record<string, string> | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if ('name' in err && err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    const mongooseErr = err as unknown as { errors: Record<string, { message: string }> };
    for (const [key, value] of Object.entries(mongooseErr.errors)) {
      errors[key] = value.message;
    }
  } else if ('code' in err && (err as { code: number }).code === 11000) {
    // Mongoose duplicate key error
    statusCode = 409;
    const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
    message = `A record with this ${field} already exists.`;
    errors = { [field]: `Duplicate value entered for ${field}` };
  } else if ('name' in err && err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if ('name' in err && err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please sign in again.';
  } else if ('name' in err && err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier format';
  }

  // Avoid logging sensitive errors or leaking stack traces in production
  if (statusCode === 500 && env.NODE_ENV !== 'production') {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};
