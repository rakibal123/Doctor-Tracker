import { z } from 'zod';
import mongoose from 'mongoose';
import { PATIENT_CONDITIONS } from '../models/Patient';

/**
 * Validates route param :id is a 24-character hexadecimal MongoDB ObjectId.
 */
export const patientIdParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Patient ID format. Must be a valid 24-character MongoDB ObjectId.',
  }),
});

/**
 * Validates request body for creating a patient.
 */
export const createPatientSchema = z.object({
  name: z
    .string({ required_error: 'Patient name is required' })
    .trim()
    .min(2, 'Patient name must be at least 2 characters long')
    .max(100, 'Patient name cannot exceed 100 characters'),
  age: z
    .number({ required_error: 'Patient age is required' })
    .int('Age must be an integer')
    .min(0, 'Age cannot be negative')
    .max(120, 'Age cannot exceed 120 years'),
  condition: z.enum(PATIENT_CONDITIONS, {
    required_error: 'Patient condition is required',
    invalid_type_error: 'Condition must be Stable, Observation, Critical, or Recovered',
  }),
  doctor: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid Doctor ID format. Must be a valid 24-character MongoDB ObjectId.',
    })
    .nullable()
    .optional(),
});

/**
 * Validates request body for updating a patient.
 * Explicitly distinguishes omitted `doctor` (unchanged) vs `doctor: null` (unassigned).
 */
export const updatePatientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Patient name must be at least 2 characters long')
      .max(100, 'Patient name cannot exceed 100 characters')
      .optional(),
    age: z
      .number()
      .int('Age must be an integer')
      .min(0, 'Age cannot be negative')
      .max(120, 'Age cannot exceed 120 years')
      .optional(),
    condition: z.enum(PATIENT_CONDITIONS).optional(),
    doctor: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid Doctor ID format. Must be a valid 24-character MongoDB ObjectId.',
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

/**
 * Validates query parameters for paginated patient listing.
 */
export const patientQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 8)) : 8)),
  q: z.string().trim().max(100).optional(),
  condition: z.enum(PATIENT_CONDITIONS).optional(),
  doctor: z
    .string()
    .trim()
    .refine((val) => val === 'unassigned' || val === 'null' || mongoose.Types.ObjectId.isValid(val), {
      message: "Doctor filter must be a valid 24-character ObjectId, 'unassigned', or 'null'",
    })
    .optional(),
  dateRange: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Number(val)), {
      message: 'dateRange must be a valid number of days (e.g. 30, 90)',
    })
    .transform((val) => (val ? Number(val) : undefined)),
  sortBy: z.enum(['createdAt', 'name', 'age']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
