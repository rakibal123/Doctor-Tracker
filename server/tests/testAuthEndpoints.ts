import http from 'http';
import app from '../src/app';

const runAuthTests = async () => {
  console.log('--- Running Stage 3A Auth Route Verification Tests ---');

  // Start Express on an ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} - ${detail || ''}`);
      failed++;
    }
  };

  try {
    // Test 1: Health check endpoint
    const resHealth = await fetch(`${baseUrl}/health`);
    const dataHealth = (await resHealth.json()) as { status: string };
    assert(resHealth.status === 200 && dataHealth.status === 'ok', 'GET /health returns 200 and status ok');

    // Test 2: Validation rejection on empty login payload
    const resEmptyLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const dataEmptyLogin = (await resEmptyLogin.json()) as { success: boolean; errors: Record<string, string> };
    assert(
      resEmptyLogin.status === 400 && dataEmptyLogin.success === false && 'email' in dataEmptyLogin.errors,
      'POST /api/v1/auth/login rejects empty payload with 400 validation error'
    );

    // Test 3: Validation rejection on invalid email format
    const resBadEmail = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });
    const dataBadEmail = (await resBadEmail.json()) as { success: boolean; errors: Record<string, string> };
    assert(
      resBadEmail.status === 400 && dataBadEmail.errors.email.includes('valid email'),
      'POST /api/v1/auth/login rejects malformed email with 400 and clear error message'
    );

    // Test 4: Rejection on missing password
    const resNoPass = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@doctortracker.com' }),
    });
    const dataNoPass = (await resNoPass.json()) as { success: boolean; errors: Record<string, string> };
    assert(
      resNoPass.status === 400 && 'password' in dataNoPass.errors,
      'POST /api/v1/auth/login rejects payload without password with 400'
    );

    // Test 5: Rejection on /api/v1/auth/me without authentication
    const resNoAuthMe = await fetch(`${baseUrl}/api/v1/auth/me`);
    const dataNoAuthMe = (await resNoAuthMe.json()) as { success: boolean; message: string };
    assert(
      resNoAuthMe.status === 401 && dataNoAuthMe.success === false,
      'GET /api/v1/auth/me returns 401 Unauthorized when unauthenticated'
    );

    // Test 6: Rejection on /api/v1/auth/me with malformed Bearer token
    const resBadToken = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.string' },
    });
    const dataBadToken = (await resBadToken.json()) as { success: boolean; message: string };
    assert(
      resBadToken.status === 401 && dataBadToken.message.includes('token'),
      'GET /api/v1/auth/me rejects invalid bearer token with 401'
    );

    // Test 7: POST /api/v1/auth/logout clears cookie
    const resLogout = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST' });
    const setCookieHeader = resLogout.headers.get('set-cookie') || '';
    assert(
      resLogout.status === 200 && setCookieHeader.includes('token='),
      'POST /api/v1/auth/logout returns 200 and emits expired cookie header'
    );

    // Test 8: 404 handler for undefined routes
    const resNotFound = await fetch(`${baseUrl}/api/v1/unknown-route`);
    assert(resNotFound.status === 404, 'Catch-all route returns 404 for unknown endpoints');

    console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }
};

runAuthTests();
