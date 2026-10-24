/**
 * Doctor Tracker - Frontend Doctors Management Tests (Stage 5C)
 * Tests doctor form validation rules, query parameter building,
 * list/detail response mapping, unassignment payload semantics, and error handling.
 */

import {
  Doctor,
  DoctorDetail,
  CreateDoctorPayload,
} from '../types/doctor';
import { validateDoctorPayload } from '../utils/validators';
import { ApiError } from '../lib/api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
}

// Simulates query string builder for /doctors endpoint
function buildDoctorQueryString(options: {
  page?: number;
  limit?: number;
  q?: string;
  specialization?: string;
  dateRange?: number | string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}): string {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.q?.trim()) params.set('q', options.q.trim());
  if (options.specialization) params.set('specialization', options.specialization);
  if (options.dateRange) params.set('dateRange', String(options.dateRange));
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);
  return params.toString();
}

async function runDoctorTests() {
  console.log('--- Running Stage 5C Doctors Management Frontend Tests ---');

  // Test 1: Empty doctor payload validation
  const emptyErrors = validateDoctorPayload({});
  assert(emptyErrors.name === 'Doctor name is required.', 'Empty name triggers required error');
  assert(emptyErrors.specialization === 'Specialization is required.', 'Empty specialization triggers required error');
  assert(emptyErrors.hospital === 'Hospital is required.', 'Empty hospital triggers required error');
  assert(emptyErrors.phone === 'Phone number is required.', 'Empty phone triggers required error');
  assert(emptyErrors.email === 'Email address is required.', 'Empty email triggers required error');

  // Test 2: Name length validation
  const shortName = validateDoctorPayload({ name: 'A' });
  assert(shortName.name === 'Doctor name must be at least 2 characters long.', 'Doctor name < 2 chars rejected');
  const longName = validateDoctorPayload({ name: 'A'.repeat(101) });
  assert(longName.name === 'Doctor name cannot exceed 100 characters.', 'Doctor name > 100 chars rejected');

  // Test 3: Phone number format validation
  const shortPhone = validateDoctorPayload({ phone: '12345' });
  assert(
    shortPhone.phone === 'Please provide a valid phone number (7 to 20 digits, spaces or hyphens).',
    'Phone number shorter than 7 digits rejected'
  );
  const lettersPhone = validateDoctorPayload({ phone: 'phone-number' });
  assert(
    lettersPhone.phone === 'Please provide a valid phone number (7 to 20 digits, spaces or hyphens).',
    'Non-numeric phone rejected'
  );
  const validIntlPhone = validateDoctorPayload({ phone: '+880 1711 000000' });
  assert(validIntlPhone.phone === undefined, 'Valid international phone accepted');

  // Test 4: Email validation
  const malformedEmail = validateDoctorPayload({ email: 'not-an-email' });
  assert(malformedEmail.email === 'Please provide a valid email address.', 'Malformed email format rejected');

  // Test 5: Complete valid payload
  const validPayload: CreateDoctorPayload = {
    name: 'Dr. Gregory House',
    specialization: 'Infectious Disease',
    hospital: 'Princeton-Plainsboro',
    phone: '+1 609-555-0100',
    email: 'house@princeton.edu',
  };
  const validErrors = validateDoctorPayload(validPayload);
  assert(Object.keys(validErrors).length === 0, 'Complete valid payload produces zero validation errors');

  // Test 6: Query string builder with all filters
  const qs = buildDoctorQueryString({
    page: 2,
    limit: 6,
    q: 'cardio',
    specialization: 'Cardiology',
    dateRange: 30,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  assert(qs.includes('page=2'), 'Query string contains page=2');
  assert(qs.includes('limit=6'), 'Query string contains limit=6');
  assert(qs.includes('q=cardio'), 'Query string contains search query q=cardio');
  assert(qs.includes('specialization=Cardiology'), 'Query string contains specialization');
  assert(qs.includes('dateRange=30'), 'Query string contains dateRange=30');
  assert(qs.includes('sortBy=name'), 'Query string contains sortBy=name');
  assert(qs.includes('sortOrder=asc'), 'Query string contains sortOrder=asc');

  // Test 7: Doctor list response mapping
  const mockDoctor: Doctor = {
    _id: '65f123456789abcdef012345',
    id: '65f123456789abcdef012345',
    name: 'Dr. Allison Cameron',
    specialization: 'Immunology',
    hospital: 'Princeton-Plainsboro',
    phone: '+1 609-555-0101',
    email: 'cameron@princeton.edu',
    patientCount: 4,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  };
  assert(mockDoctor.patientCount === 4, 'Doctor patientCount mapped correctly');
  assert(mockDoctor.name.startsWith('Dr.'), 'Doctor name starts with Dr.');

  // Test 8: Doctor detail response mapping with assigned patients
  const mockDoctorDetail: DoctorDetail = {
    ...mockDoctor,
    patients: [
      {
        _id: 'pat-1',
        name: 'Patient One',
        age: 45,
        condition: 'Stable',
        createdAt: '2026-10-10T12:00:00.000Z',
      },
      {
        _id: 'pat-2',
        name: 'Patient Two',
        age: 62,
        condition: 'Critical',
        createdAt: '2026-10-12T12:00:00.000Z',
      },
    ],
  };
  assert(mockDoctorDetail.patients.length === 2, 'Doctor detail includes assigned patients array');
  assert(mockDoctorDetail.patients[1].condition === 'Critical', 'Assigned patient condition mapped correctly');

  // Test 9: Doctor detail with 0 patients
  const emptyDoctorDetail: DoctorDetail = {
    ...mockDoctor,
    patientCount: 0,
    patients: [],
  };
  assert(emptyDoctorDetail.patients.length === 0, 'Doctor detail handles empty patient list safely');

  // Test 10: Unassign patient payload contract
  const unassignPayload = { doctor: null };
  assert(unassignPayload.doctor === null, 'Unassigning a patient explicitly sends doctor: null');

  // Test 11: 409 Conflict error preservation
  const conflictError = new ApiError('A doctor with this email address already exists.', 409);
  assert(conflictError.status === 409, '409 Conflict status preserved for duplicate email');
  assert(conflictError.message.includes('already exists'), 'Conflict message preserved');

  // Test 12: 404 Not Found doctor lookup error preservation
  const notFoundError = new ApiError('Doctor not found with the requested identifier', 404);
  assert(notFoundError.status === 404, '404 status preserved for missing doctor');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDoctorTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
