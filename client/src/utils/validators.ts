/**
 * Client-side validation utilities for Doctor Tracker forms.
 * Enforces same constraints as server validations (Zod schemas).
 */

import { CreateDoctorPayload } from '../types/doctor';
import { CreatePatientPayload } from '../types/patient';
import { PatientCondition } from '../types/dashboard';

/**
 * Validates doctor form fields client-side prior to API submission.
 * Enforces same constraints as server/src/validations/doctorValidation.ts
 */
export function validateDoctorPayload(payload: Partial<CreateDoctorPayload>): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() || '';
  if (!name) {
    errors.name = 'Doctor name is required.';
  } else if (name.length < 2) {
    errors.name = 'Doctor name must be at least 2 characters long.';
  } else if (name.length > 100) {
    errors.name = 'Doctor name cannot exceed 100 characters.';
  }

  const spec = payload.specialization?.trim() || '';
  if (!spec) {
    errors.specialization = 'Specialization is required.';
  } else if (spec.length < 2) {
    errors.specialization = 'Specialization must be at least 2 characters long.';
  } else if (spec.length > 100) {
    errors.specialization = 'Specialization cannot exceed 100 characters.';
  }

  const hosp = payload.hospital?.trim() || '';
  if (!hosp) {
    errors.hospital = 'Hospital is required.';
  } else if (hosp.length < 2) {
    errors.hospital = 'Hospital must be at least 2 characters long.';
  } else if (hosp.length > 150) {
    errors.hospital = 'Hospital cannot exceed 150 characters.';
  }

  const phone = payload.phone?.trim() || '';
  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!/^[+]?[0-9\s-]{7,20}$/.test(phone)) {
    errors.phone = 'Please provide a valid phone number (7 to 20 digits, spaces or hyphens).';
  }

  const email = payload.email?.trim().toLowerCase() || '';
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  return errors;
}

/**
 * Validates patient form inputs client-side prior to API submission.
 * Enforces same constraints as server/src/validations/patientValidation.ts
 */
export function validatePatientPayload(payload: Partial<CreatePatientPayload>): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() || '';
  if (!name) {
    errors.name = 'Patient name is required.';
  } else if (name.length < 2) {
    errors.name = 'Patient name must be at least 2 characters long.';
  } else if (name.length > 100) {
    errors.name = 'Patient name cannot exceed 100 characters.';
  }

  if (payload.age === undefined || payload.age === null || String(payload.age).trim() === '') {
    errors.age = 'Patient age is required.';
  } else {
    const ageNum = Number(payload.age);
    if (!Number.isInteger(ageNum)) {
      errors.age = 'Age must be an integer.';
    } else if (ageNum < 0) {
      errors.age = 'Age cannot be negative.';
    } else if (ageNum > 120) {
      errors.age = 'Enter an age between 0 and 120.';
    }
  }

  const validConditions: PatientCondition[] = ['Stable', 'Observation', 'Critical', 'Recovered'];
  if (!payload.condition) {
    errors.condition = 'Patient condition is required.';
  } else if (!validConditions.includes(payload.condition)) {
    errors.condition = 'Condition must be Stable, Observation, Critical, or Recovered.';
  }

  if (payload.doctor !== undefined && payload.doctor !== null && payload.doctor !== '') {
    if (!/^[0-9a-fA-F]{24}$/.test(payload.doctor)) {
      errors.doctor = 'Invalid Doctor ID format. Must be a 24-character hexadecimal ObjectId.';
    }
  }

  return errors;
}
