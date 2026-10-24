/**
 * Doctor Tracker - Doctor TypeScript Definitions
 * Aligns with server/src/validations/doctorValidation.ts and Doctor Tracker.html reference.
 */

import { PatientCondition } from './dashboard';

export interface Doctor {
  _id: string;
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorPatient {
  _id: string;
  name: string;
  age: number;
  condition: PatientCondition;
  createdAt: string;
}

export interface DoctorDetail extends Doctor {
  patients: DoctorPatient[];
}

export interface CreateDoctorPayload {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
}

export type UpdateDoctorPayload = Partial<CreateDoctorPayload>;

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DoctorListResponse {
  doctors: Doctor[];
  pagination: PaginationMetadata;
}

export interface DoctorDetailResponse {
  doctor: DoctorDetail;
}

export interface DoctorQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  specialization?: string;
  dateRange?: number;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}


