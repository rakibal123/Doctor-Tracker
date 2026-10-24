import http from 'http';
import app from '../src/app';
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorQuerySchema,
  objectIdParamSchema,
} from '../src/validations/doctorValidation';

const runDoctorTests = async () => {
  console.log('--- Running Stage 3B-1 Doctor API Verification Tests ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api/v1/doctors`;

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
    // Section 1: Route Authentication Protection (Must reject all unauthenticated requests with 401)
    const testId = '507f1f77bcf86cd799439011';

    const resGetList = await fetch(`${baseUrl}`);
    assert(resGetList.status === 401, 'GET /api/v1/doctors is protected and returns 401 Unauthorized');

    const resGetOne = await fetch(`${baseUrl}/${testId}`);
    assert(resGetOne.status === 401, 'GET /api/v1/doctors/:id is protected and returns 401 Unauthorized');

    const resPost = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Test' }),
    });
    assert(resPost.status === 401, 'POST /api/v1/doctors is protected and returns 401 Unauthorized');

    const resPatch = await fetch(`${baseUrl}/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospital: 'Test Hospital' }),
    });
    assert(resPatch.status === 401, 'PATCH /api/v1/doctors/:id is protected and returns 401 Unauthorized');

    const resDelete = await fetch(`${baseUrl}/${testId}`, { method: 'DELETE' });
    assert(resDelete.status === 401, 'DELETE /api/v1/doctors/:id is protected and returns 401 Unauthorized');

    // Section 2: Zod Validation - ObjectId Param Schema
    const validIdResult = objectIdParamSchema.safeParse({ id: '507f1f77bcf86cd799439011' });
    assert(validIdResult.success, 'objectIdParamSchema accepts valid 24-char hexadecimal ObjectId');

    const invalidIdResult = objectIdParamSchema.safeParse({ id: 'not-an-objectid' });
    assert(
      !invalidIdResult.success && invalidIdResult.error.issues[0].message.includes('MongoDB ObjectId'),
      'objectIdParamSchema rejects malformed ObjectId format'
    );

    // Section 3: Zod Validation - Create Doctor Schema
    const validDoctor = {
      name: 'Dr. Amina Rahman',
      specialization: 'Cardiology',
      hospital: 'Square Hospital',
      phone: '+880 1712345671',
      email: 'amina.rahman@doctortracker.com',
    };
    const validDocResult = createDoctorSchema.safeParse(validDoctor);
    assert(validDocResult.success, 'createDoctorSchema accepts complete, valid doctor payload');

    const missingFieldsResult = createDoctorSchema.safeParse({});
    assert(
      !missingFieldsResult.success &&
        missingFieldsResult.error.issues.length === 5 &&
        ['name', 'specialization', 'hospital', 'phone', 'email'].every((k) =>
          missingFieldsResult.error.issues.some((i) => i.path[0] === k)
        ),
      'createDoctorSchema enforces all 5 mandatory fields (name, spec, hosp, phone, email)'
    );

    const badEmailResult = createDoctorSchema.safeParse({
      ...validDoctor,
      email: 'invalid-email-string',
    });
    assert(!badEmailResult.success, 'createDoctorSchema rejects malformed email address');

    const badPhoneResult = createDoctorSchema.safeParse({
      ...validDoctor,
      phone: '123', // too short (<7 chars)
    });
    assert(!badPhoneResult.success, 'createDoctorSchema rejects phone number shorter than 7 digits');

    // Section 4: Zod Validation - Update Doctor Schema
    const validUpdate = updateDoctorSchema.safeParse({ hospital: 'Evercare Hospital' });
    assert(validUpdate.success, 'updateDoctorSchema accepts partial field updates');

    const emptyUpdate = updateDoctorSchema.safeParse({});
    assert(!emptyUpdate.success, 'updateDoctorSchema rejects empty update objects');

    // Section 5: Zod Validation - Query Parameters & Coercion
    const defaultQuery = doctorQuerySchema.parse({});
    assert(defaultQuery.page === 1 && defaultQuery.limit === 6, 'doctorQuerySchema applies default page=1, limit=6');

    const coercedQuery = doctorQuerySchema.parse({ page: '-5', limit: '500', dateRange: '30' });
    assert(
      coercedQuery.page === 1 && coercedQuery.limit === 100 && coercedQuery.dateRange === 30,
      'doctorQuerySchema bounds page >= 1, limit <= 100, and coerces dateRange to number'
    );

    const invalidDateRange = doctorQuerySchema.safeParse({ dateRange: 'not-a-number' });
    assert(!invalidDateRange.success, 'doctorQuerySchema rejects non-numeric dateRange parameter');

    console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }
};

runDoctorTests();
