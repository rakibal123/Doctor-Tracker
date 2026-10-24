/**
 * Doctor Tracker - Patient TypeScript Definitions
 * Aligns with server/src/validations/patientValidation.ts and Doctor Tracker.html reference.
 */

import { PatientCondition } from './dashboard';
import { PaginationMetadata } from './doctor';

export interface PatientDoctor {
  _id: string;
  id?: string;
  name: string;
  specialization?: string;
  hospital?: string;
  email?: string;
  phone?: string;
}

export interface Patient {
  _id: string;
  id: string;
  name: string;
  age: number;
  condition: PatientCondition;
  doctor: PatientDoctor | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientPayload {
  name: string;
  age: number;
  condition: PatientCondition;
  doctor: string | null;
}

export type UpdatePatientPayload = Partial<CreatePatientPayload>;

export interface PatientListResponse {
  patients: Patient[];
  pagination: PaginationMetadata;
}

export interface PatientDetailResponse {
  patient: Patient;
}

export interface PatientQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  condition?: PatientCondition;
  doctor?: string;
  dateRange?: number;
  sortBy?: 'createdAt' | 'name' | 'age';
  sortOrder?: 'asc' | 'desc';
}


