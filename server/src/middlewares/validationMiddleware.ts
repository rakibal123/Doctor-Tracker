import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';

type ValidatableSchema = AnyZodObject | ZodEffects<AnyZodObject>;

const formatZodErrors = (error: ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'general';
    errors[path] = issue.message;
  }
  return errors;
};

export const validateBody = (schema: ValidatableSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed. Please check the entered data.',
          errors: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ValidatableSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters.',
          errors: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ValidatableSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request parameter format.',
          errors: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
};

// Default export alias for body validation compatibility
export const validateRequest = validateBody;
