import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validates that a route param is a valid 24-character hexadecimal MongoDB ObjectId.
 */
export const objectIdParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Doctor ID format. Must be a valid 24-character MongoDB ObjectId.',
  }),
});

export const createDoctorSchema = z.object({
  name: z
    .string({ required_error: 'Doctor name is required' })
    .trim()
    .min(2, 'Doctor name must be at least 2 characters long')
    .max(100, 'Doctor name cannot exceed 100 characters'),
  specialization: z
    .string({ required_error: 'Specialization is required' })
    .trim()
    .min(2, 'Specialization must be at least 2 characters long')
    .max(100, 'Specialization cannot exceed 100 characters'),
  hospital: z
    .string({ required_error: 'Hospital is required' })
    .trim()
    .min(2, 'Hospital must be at least 2 characters long')
    .max(150, 'Hospital cannot exceed 150 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^[+]?[0-9\s-]{7,20}$/, 'Please provide a valid phone number (7 to 20 digits, spaces or hyphens)'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
});

export const updateDoctorSchema = createDoctorSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export const doctorQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 6)) : 6)),
  q: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(100).optional(),
  dateRange: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Number(val)), {
      message: 'dateRange must be a valid number of days (e.g. 30, 90, 365)',
    })
    .transform((val) => (val ? Number(val) : undefined)),
  sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorQueryInput = z.infer<typeof doctorQuerySchema>;
