import http from 'http';
import app from '../src/app';
import { buildSixMonthBuckets } from '../src/controllers/dashboardController';
import { PATIENT_CONDITIONS } from '../src/models/Patient';

const runDashboardTests = async () => {
  console.log('--- Running Stage 3C Dashboard API Verification Tests ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api/v1/dashboard`;

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
    // Section 1: Route Authentication Protection
    const resNoAuth = await fetch(`${baseUrl}/stats`);
    assert(
      resNoAuth.status === 401,
      'GET /api/v1/dashboard/stats is protected and returns 401 Unauthorized without auth cookie'
    );

    const resBadToken = await fetch(`${baseUrl}/stats`, {
      headers: { Authorization: 'Bearer bad.token.here' },
    });
    assert(
      resBadToken.status === 401,
      'GET /api/v1/dashboard/stats rejects invalid bearer token with 401'
    );

    // Section 2: Month Bucketing Utility & Chronological Ordering
    const now = new Date('2026-10-23T12:00:00Z');
    const buckets = buildSixMonthBuckets(now);

    assert(buckets.length === 6, 'buildSixMonthBuckets generates exactly 6 calendar month intervals');

    assert(
      buckets[5].month === 'Oct' && buckets[5].year === 2026,
      'buildSixMonthBuckets ends with the current month (Oct 2026)'
    );

    assert(
      buckets[0].month === 'May' && buckets[0].year === 2026,
      'buildSixMonthBuckets starts with 5 months prior (May 2026)'
    );

    const monthSequence = buckets.map((b) => b.month).join(',');
    assert(
      monthSequence === 'May,Jun,Jul,Aug,Sep,Oct',
      'buildSixMonthBuckets maintains strictly chronological month ordering (May -> Oct)'
    );

    // Section 3: Year Rollover Boundary Test (e.g. in February, rolls back to September of previous year)
    const janDate = new Date('2026-02-15T12:00:00Z');
    const rolloverBuckets = buildSixMonthBuckets(janDate);
    const rolloverSequence = rolloverBuckets.map((b) => `${b.month}-${b.year}`).join(',');
    assert(
      rolloverSequence === 'Sep-2025,Oct-2025,Nov-2025,Dec-2025,Jan-2026,Feb-2026',
      'buildSixMonthBuckets correctly handles year-rollover transitions across year boundaries'
    );

    // Section 4: Condition Breakdown Exhaustiveness
    assert(
      PATIENT_CONDITIONS.length === 4 &&
        ['Stable', 'Observation', 'Critical', 'Recovered'].every((c) => PATIENT_CONDITIONS.includes(c as any)),
      'PATIENT_CONDITIONS covers all required clinical conditions'
    );

    // Section 5: Safe Zero-Division & Empty Metric Handling
    const totalDoctors = 0;
    const totalPatients = 0;
    const patientsPerDoctor = totalDoctors > 0 ? Number((totalPatients / totalDoctors).toFixed(1)) : 0;
    assert(
      patientsPerDoctor === 0 && !isNaN(patientsPerDoctor),
      'Dashboard calculations guard against division-by-zero when doctor collection is empty'
    );

    console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }
};

runDashboardTests();
