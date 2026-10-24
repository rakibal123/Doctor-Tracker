import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    PORT: z
      .string()
      .default('5000')
      .transform((val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error('PORT must be a valid number');
        }
        return parsed;
      }),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI must be provided'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CLIENT_URL: z.string().min(1, 'CLIENT_URL must be provided').default('http://localhost:3000'),
    SEED_ADMIN_EMAIL: z.string().email().default('admin@doctortracker.com'),
    SEED_ADMIN_PASSWORD: z.string().min(6).default('password123'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.CLIENT_URL.includes('*')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CLIENT_URL cannot contain wildcard "*" in production when credentials are enabled',
          path: ['CLIENT_URL'],
        });
      }
      if (data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET must be at least 32 characters in production',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  const formattedErrors = parsed.error.format();
  for (const [key, value] of Object.entries(formattedErrors)) {
    if (key !== '_errors' && value && '_errors' in value) {
      console.error(` - ${key}: ${(value as { _errors: string[] })._errors.join(', ')}`);
    }
  }
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
