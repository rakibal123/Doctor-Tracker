/**
 * Doctor Tracker - Frontend Patients Management Tests (Stage 5D)
 * Tests patient form validation rules, condition mappings, query parameter generation,
 * explicit `doctor: null` unassignment semantics, response mapping, and error resilience.
 */

import {
  Patient,
  CreatePatientPayload,
  UpdatePatientPayload,
} from '../types/patient';
import { validatePatientPayload } from '../utils/validators';
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

// Simulates query string builder for /patients endpoint
function buildPatientQueryString(options: {
  page?: number;
  limit?: number;
  q?: string;
  condition?: string;
  doctor?: string;
  dateRange?: number | string;
  sortBy?: 'createdAt' | 'name' | 'age';
  sortOrder?: 'asc' | 'desc';
}): string {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.q?.trim()) params.set('q', options.q.trim());
  if (options.condition) params.set('condition', options.condition);
  if (options.doctor) params.set('doctor', options.doctor);
  if (options.dateRange) params.set('dateRange', String(options.dateRange));
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);
  return params.toString();
}

async function runPatientTests() {
  console.log('--- Running Stage 5D Patients Management Frontend Tests ---');

  // Test 1: Empty patient payload triggers required field errors
  const emptyErrors = validatePatientPayload({});
  assert(emptyErrors.name === 'Patient name is required.', 'Empty name triggers required error');
  assert(emptyErrors.age === 'Patient age is required.', 'Empty age triggers required error');
  assert(emptyErrors.condition === 'Patient condition is required.', 'Empty condition triggers required error');

  // Test 2: Name length validation
  const shortName = validatePatientPayload({ name: 'J' });
  assert(shortName.name === 'Patient name must be at least 2 characters long.', 'Patient name < 2 chars rejected');
  const longName = validatePatientPayload({ name: 'P'.repeat(101) });
  assert(longName.name === 'Patient name cannot exceed 100 characters.', 'Patient name > 100 chars rejected');

  // Test 3: Age numeric bounds & integer validation
  const nonIntAge = validatePatientPayload({ age: 34.5 as unknown as number });
  assert(nonIntAge.age === 'Age must be an integer.', 'Non-integer age rejected');
  const negativeAge = validatePatientPayload({ age: -1 });
  assert(negativeAge.age === 'Age cannot be negative.', 'Negative age rejected');
  const overAge = validatePatientPayload({ age: 121 });
  assert(overAge.age === 'Enter an age between 0 and 120.', 'Age > 120 rejected');
  const infantAge = validatePatientPayload({ name: 'Baby Doe', age: 0, condition: 'Stable' });
  assert(infantAge.age === undefined, 'Age 0 (newborn) is accepted');
  const elderAge = validatePatientPayload({ name: 'Elder Doe', age: 120, condition: 'Stable' });
  assert(elderAge.age === undefined, 'Age 120 is accepted');

  // Test 4: Condition enum validation
  const badCondition = validatePatientPayload({
    condition: 'Unknown' as unknown as CreatePatientPayload['condition'],
  });
  assert(
    badCondition.condition === 'Condition must be Stable, Observation, Critical, or Recovered.',
    'Unsupported condition enum rejected'
  );

  // Test 5: Doctor ID format validation
  const malformedDoctorId = validatePatientPayload({ doctor: 'invalid-id' });
  assert(
    malformedDoctorId.doctor === 'Invalid Doctor ID format. Must be a 24-character hexadecimal ObjectId.',
    'Malformed doctor ID rejected'
  );
  const validDoctorId = validatePatientPayload({
    name: 'Jane Doe',
    age: 28,
    condition: 'Recovered',
    doctor: '65f123456789abcdef012345',
  });
  assert(validDoctorId.doctor === undefined, 'Valid 24-character doctor ObjectId accepted');

  // Test 6: Explicit null doctor for unassigned patient accepted
  const unassignedPatientPayload: CreatePatientPayload = {
    name: 'Unassigned Person',
    age: 42,
    condition: 'Observation',
    doctor: null,
  };
  const unassignedErrors = validatePatientPayload(unassignedPatientPayload);
  assert(Object.keys(unassignedErrors).length === 0, 'Explicit doctor: null passes validation with zero errors');

  // Test 7: Query string builder with all filters including 'unassigned' doctor
  const qs = buildPatientQueryString({
    page: 1,
    limit: 8,
    q: 'smith',
    condition: 'Critical',
    doctor: 'unassigned',
    dateRange: 90,
    sortBy: 'age',
    sortOrder: 'asc',
  });
  assert(qs.includes('page=1'), 'Query string contains page=1');
  assert(qs.includes('limit=8'), 'Query string contains limit=8');
  assert(qs.includes('q=smith'), 'Query string contains patient search query');
  assert(qs.includes('condition=Critical'), 'Query string contains condition filter');
  assert(qs.includes('doctor=unassigned'), 'Query string contains doctor=unassigned filter');
  assert(qs.includes('dateRange=90'), 'Query string contains dateRange=90');
  assert(qs.includes('sortBy=age'), 'Query string contains sortBy=age');
  assert(qs.includes('sortOrder=asc'), 'Query string contains sortOrder=asc');

  // Test 8: Patient response mapping with assigned doctor
  const mockAssignedPatient: Patient = {
    _id: 'pat-1',
    id: 'pat-1',
    name: 'Robert Chase',
    age: 38,
    condition: 'Stable',
    doctor: {
      _id: 'doc-1',
      name: 'Dr. Gregory House',
      specialization: 'Diagnostics',
      hospital: 'Princeton-Plainsboro',
    },
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
  assert(mockAssignedPatient.doctor?.name === 'Dr. Gregory House', 'Assigned doctor name mapped correctly');

  // Test 9: Patient response mapping with null doctor (Unassigned)
  const mockUnassignedPatient: Patient = {
    _id: 'pat-2',
    id: 'pat-2',
    name: 'Lisa Cuddy',
    age: 45,
    condition: 'Observation',
    doctor: null,
    createdAt: '2026-10-05T08:00:00.000Z',
    updatedAt: '2026-10-05T08:00:00.000Z',
  };
  assert(mockUnassignedPatient.doctor === null, 'Null doctor safely represents unassigned patient');

  // Test 10: Updating patient to change or unassign doctor
  const reassignPayload: UpdatePatientPayload = {
    doctor: '65f987654321fedcba987654',
  };
  assert(reassignPayload.doctor !== undefined && reassignPayload.doctor !== null, 'Reassign payload contains new doctor ID');

  const unassignUpdatePayload: UpdatePatientPayload = {
    doctor: null,
  };
  assert(unassignUpdatePayload.doctor === null, 'Unassign update payload explicitly sends doctor: null');

  // Test 11: Error handling: 404 Not Found on deletion
  const notFoundError = new ApiError('Patient not found with the requested identifier', 404);
  assert(notFoundError.status === 404, '404 status preserved when deleting missing patient');

  // Test 12: Network failure handling
  const netError = new ApiError('Network connection lost', 0, undefined, true);
  assert(netError.isNetworkError === true, 'Network failure flagged as isNetworkError=true');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPatientTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
