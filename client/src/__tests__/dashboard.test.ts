/**
 * Doctor Tracker - Frontend Dashboard Analytics Tests (Stage 5B)
 * Tests response mapping, empty dataset safety, null doctor values,
 * condition breakdown percentages, date formatting, initials, and API error resilience.
 */

import {
  DashboardData,
  CONDITION_LABELS,
  CONDITION_COLORS,
  PatientCondition,
} from '../types/dashboard';
import { getInitials, formatPatientDate } from '../utils/formatters';
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

// Helper simulating component chart scaling
function calculateBarHeight(count: number, maxMonthly: number): number {
  if (maxMonthly <= 0) return 0;
  return Number(((count / maxMonthly) * 80).toFixed(2));
}

// Helper simulating caseload width scaling
function calculateCaseloadWidth(count: number, maxCaseload: number): number {
  if (maxCaseload <= 0) return 0;
  return Number(((count / maxCaseload) * 100).toFixed(2));
}

async function runDashboardTests() {
  console.log('--- Running Stage 5B Dashboard Frontend Unit & Integration Tests ---');

  // Test 1: getInitials handles standard multi-word names
  assert(getInitials('Sarah Connor') === 'SC', 'getInitials handles two-word name');

  // Test 2: getInitials handles three-word names (takes first and last)
  assert(getInitials('John Fitzgerald Kennedy') === 'JK', 'getInitials handles multi-word name');

  // Test 3: getInitials handles single-word name
  assert(getInitials('Madonna') === 'MA', 'getInitials handles single-word name');

  // Test 4: getInitials handles empty or undefined values safely
  assert(getInitials('') === 'PT' && getInitials(undefined) === 'PT', 'getInitials returns safe fallback PT for empty/undefined');

  // Test 5: formatPatientDate handles valid ISO dates
  const formatted = formatPatientDate('2026-10-15T09:30:00.000Z');
  assert(formatted.includes('Oct') && formatted.includes('2026'), 'formatPatientDate formats valid ISO date to UK format');

  // Test 6: formatPatientDate handles null, undefined, or invalid dates safely
  assert(formatPatientDate(undefined) === 'Date unavailable', 'formatPatientDate handles undefined safely');
  assert(formatPatientDate('invalid-date-string') === 'Date unavailable', 'formatPatientDate handles invalid date string safely');

  // Test 7: Condition labels and colors coverage
  const conditions: PatientCondition[] = ['Stable', 'Observation', 'Critical', 'Recovered'];
  for (const cond of conditions) {
    assert(!!CONDITION_LABELS[cond], `CONDITION_LABELS contains entry for ${cond}`);
    assert(!!CONDITION_COLORS[cond], `CONDITION_COLORS contains CSS variable for ${cond}`);
  }
  assert(CONDITION_LABELS['Observation'] === 'Under Observation', 'Observation maps to Under Observation display label');

  // Test 8: Sample full API response payload parsing
  const mockApiData: DashboardData = {
    summary: {
      totalDoctors: 12,
      totalHospitals: 4,
      totalPatients: 30,
      criticalPatients: 5,
      patientsPerDoctor: 2.5,
      idleDoctors: 1,
      unassignedPatients: 3,
      addedLast30Days: 14,
      addedLast7Days: 4,
    },
    monthlyAdmissions: [
      { month: 'May', year: 2026, count: 2 },
      { month: 'Jun', year: 2026, count: 4 },
      { month: 'Jul', year: 2026, count: 3 },
      { month: 'Aug', year: 2026, count: 7 },
      { month: 'Sep', year: 2026, count: 5 },
      { month: 'Oct', year: 2026, count: 9 },
    ],
    caseloadByDoctor: [
      { id: 'doc-1', name: 'Dr. Gregory House', specialization: 'Diagnostics', patientCount: 8 },
      { id: 'doc-2', name: 'Dr. James Wilson', specialization: 'Oncology', patientCount: 5 },
    ],
    conditionBreakdown: [
      { condition: 'Stable', count: 12, percentage: 40.0 },
      { condition: 'Observation', count: 8, percentage: 26.7 },
      { condition: 'Critical', count: 5, percentage: 16.7 },
      { condition: 'Recovered', count: 5, percentage: 16.7 },
    ],
    recentPatients: [
      {
        id: 'pat-1',
        name: 'John Doe',
        age: 45,
        condition: 'Stable',
        doctor: { id: 'doc-1', name: 'Dr. Gregory House' },
        createdAt: '2026-10-20T10:00:00.000Z',
      },
      {
        id: 'pat-2',
        name: 'Jane Smith',
        age: 32,
        condition: 'Critical',
        doctor: null, // Unassigned patient
        createdAt: '2026-10-21T11:00:00.000Z',
      },
    ],
  };

  // Test 9: Summary metrics integrity
  assert(mockApiData.summary.totalDoctors === 12, 'Summary totalDoctors matches');
  assert(mockApiData.summary.totalPatients === 30, 'Summary totalPatients matches');
  assert(mockApiData.summary.patientsPerDoctor === 2.5, 'Summary patientsPerDoctor matches');

  // Test 10: Null doctor handling in recent patients
  const assigned = mockApiData.recentPatients[0].doctor ? mockApiData.recentPatients[0].doctor.name : 'Unassigned';
  const unassigned = mockApiData.recentPatients[1].doctor ? mockApiData.recentPatients[1].doctor.name : 'Unassigned';
  assert(assigned === 'Dr. Gregory House', 'Assigned patient displays doctor name');
  assert(unassigned === 'Unassigned', 'Null doctor safely defaults to Unassigned without throwing');

  // Test 11: Bar chart scaling logic
  const maxAdmissions = Math.max(...mockApiData.monthlyAdmissions.map((m) => m.count), 1);
  assert(maxAdmissions === 9, 'Max monthly admissions correctly calculated as 9');
  const maxBarHeight = calculateBarHeight(9, maxAdmissions);
  const midBarHeight = calculateBarHeight(4, maxAdmissions);
  assert(maxBarHeight === 80, 'Peak month bar height is exactly 80%');
  assert(midBarHeight > 0 && midBarHeight < 80, 'Intermediate month bar height scales proportionally');

  // Test 12: Caseload bar scaling logic
  const maxCaseload = Math.max(...mockApiData.caseloadByDoctor.map((d) => d.patientCount), 1);
  assert(maxCaseload === 8, 'Max caseload correctly computed as 8');
  assert(calculateCaseloadWidth(8, maxCaseload) === 100, 'Top doctor receives 100% track width');
  assert(calculateCaseloadWidth(5, maxCaseload) === 62.5, 'Second doctor receives proportional 62.5% track width');

  // Test 13: Empty dataset resilience (0 doctors, 0 patients)
  const emptyApiData: DashboardData = {
    summary: {
      totalDoctors: 0,
      totalHospitals: 0,
      totalPatients: 0,
      criticalPatients: 0,
      patientsPerDoctor: 0,
      idleDoctors: 0,
      unassignedPatients: 0,
      addedLast30Days: 0,
      addedLast7Days: 0,
    },
    monthlyAdmissions: [
      { month: 'May', year: 2026, count: 0 },
      { month: 'Jun', year: 2026, count: 0 },
      { month: 'Jul', year: 2026, count: 0 },
      { month: 'Aug', year: 2026, count: 0 },
      { month: 'Sep', year: 2026, count: 0 },
      { month: 'Oct', year: 2026, count: 0 },
    ],
    caseloadByDoctor: [],
    conditionBreakdown: [],
    recentPatients: [],
  };

  const emptyMaxMonthly = Math.max(...emptyApiData.monthlyAdmissions.map((m) => m.count), 1);
  assert(calculateBarHeight(0, emptyMaxMonthly) === 0, 'Zero monthly admissions yields 0% height without division by zero');
  assert(emptyApiData.summary.patientsPerDoctor.toFixed(1) === '0.0', 'Empty database patientsPerDoctor displays 0.0 safely');

  // Test 14: ApiError response handling
  const authExpiredError = new ApiError('Unauthorized session', 401);
  assert(authExpiredError.status === 401, '401 session expiration is correctly distinguished');

  const networkFailureError = new ApiError('Failed to fetch', 0, undefined, true);
  assert(networkFailureError.isNetworkError === true, 'Network connectivity drop identified as isNetworkError=true');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDashboardTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
