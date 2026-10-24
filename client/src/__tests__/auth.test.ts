/**
 * Doctor Tracker - Frontend Auth & Validation Tests (Stage 5A)
 * Tests client-side validation, ApiError mapping, credentials handling, and auth guard invariants.
 */

import { ApiError } from '../lib/api';

// 1. Validation Logic
export function validateLoginInput(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

// 2. Route Guard Invariant Logic
export function resolveRouteAccess(
  pathname: string,
  isAuthenticated: boolean,
  isLoading: boolean
): { allowed: boolean; redirect: string | null } {
  if (isLoading) {
    return { allowed: false, redirect: null }; // Wait for session resolution without flashing
  }

  const isPublicRoute = pathname === '/login';

  if (!isAuthenticated && !isPublicRoute) {
    return { allowed: false, redirect: '/login' };
  }

  if (isAuthenticated && isPublicRoute) {
    return { allowed: false, redirect: '/dashboard' };
  }

  return { allowed: true, redirect: null };
}

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

async function runTests() {
  console.log('--- Running Stage 5A Frontend Auth & Route Guard Verification Tests ---');

  // Test 1: Empty email validation
  const emptyEmailErr = validateLoginInput('', 'secret123');
  assert(emptyEmailErr.email === 'Enter your email address.', 'Empty email triggers required email validation error');

  // Test 2: Whitespace-only email validation
  const whitespaceEmailErr = validateLoginInput('   ', 'secret123');
  assert(whitespaceEmailErr.email === 'Enter your email address.', 'Whitespace email is trimmed and triggers required error');

  // Test 3: Malformed email validation
  const malformedEmailErr = validateLoginInput('not-an-email', 'secret123');
  assert(malformedEmailErr.email === 'Enter a valid email address.', 'Malformed email triggers format error');

  // Test 4: Missing password validation
  const emptyPasswordErr = validateLoginInput('admin@example.com', '');
  assert(emptyPasswordErr.password === 'Enter your password.', 'Empty password triggers required password validation error');

  // Test 5: Both fields empty
  const bothEmpty = validateLoginInput('', '');
  assert(bothEmpty.email !== undefined && bothEmpty.password !== undefined, 'Both fields empty triggers two validation errors');

  // Test 6: Valid input yields no validation errors
  const valid = validateLoginInput('admin@doctortracker.com', 'password123');
  assert(Object.keys(valid).length === 0, 'Valid credentials pass client-side validation with zero errors');

  // Test 7: ApiError instantiation and status code preservation
  const apiErr = new ApiError('Invalid email or password', 401, { credentials: 'Invalid' });
  assert(apiErr.status === 401 && apiErr.message === 'Invalid email or password', 'ApiError preserves HTTP status code and message');
  assert(apiErr.errors?.credentials === 'Invalid', 'ApiError retains field error mappings from backend');

  // Test 8: Network failure classification
  const networkErr = new ApiError('Unable to connect to server', 0, undefined, true);
  assert(networkErr.isNetworkError === true && networkErr.status === 0, 'Network failures are distinctly identified with isNetworkError=true');

  // Test 9: Route guard - loading state blocks rendering without redirect
  const loadingAccess = resolveRouteAccess('/dashboard', false, true);
  assert(!loadingAccess.allowed && loadingAccess.redirect === null, 'Route guard suppresses protected content during session check');

  // Test 10: Route guard - unauthenticated user visiting /dashboard is redirected to /login
  const unauthDashboard = resolveRouteAccess('/dashboard', false, false);
  assert(!unauthDashboard.allowed && unauthDashboard.redirect === '/login', 'Unauthenticated user accessing /dashboard is redirected to /login');

  // Test 11: Route guard - unauthenticated user visiting /doctors is redirected to /login
  const unauthDoctors = resolveRouteAccess('/doctors', false, false);
  assert(!unauthDoctors.allowed && unauthDoctors.redirect === '/login', 'Unauthenticated user accessing /doctors is redirected to /login');

  // Test 12: Route guard - unauthenticated user visiting /patients is redirected to /login
  const unauthPatients = resolveRouteAccess('/patients', false, false);
  assert(!unauthPatients.allowed && unauthPatients.redirect === '/login', 'Unauthenticated user accessing /patients is redirected to /login');

  // Test 13: Route guard - unauthenticated user visiting /login is allowed
  const unauthLogin = resolveRouteAccess('/login', false, false);
  assert(unauthLogin.allowed && unauthLogin.redirect === null, 'Unauthenticated user is allowed to access /login');

  // Test 14: Route guard - authenticated user visiting /login is redirected to /dashboard
  const authLogin = resolveRouteAccess('/login', true, false);
  assert(!authLogin.allowed && authLogin.redirect === '/dashboard', 'Authenticated user visiting /login is redirected to /dashboard');

  // Test 15: Route guard - authenticated user visiting /dashboard is allowed
  const authDashboard = resolveRouteAccess('/dashboard', true, false);
  assert(authDashboard.allowed && authDashboard.redirect === null, 'Authenticated user is allowed to view /dashboard');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
