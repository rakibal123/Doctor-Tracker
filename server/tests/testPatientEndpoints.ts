import http from 'http';
import app from '../src/app';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  patientIdParamSchema,
} from '../src/validations/patientValidation';

const runPatientTests = async () => {
  console.log('--- Running Stage 3B-2 Patient API Verification Tests ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api/v1/patients`;

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
    const testId = '507f1f77bcf86cd799439011';

    // Section 1: Route Authentication Protection (All routes must reject unauthenticated requests with 401)
    const resGetList = await fetch(`${baseUrl}`);
    assert(resGetList.status === 401, 'GET /api/v1/patients is protected and returns 401 Unauthorized');

    const resGetOne = await fetch(`${baseUrl}/${testId}`);
    assert(resGetOne.status === 401, 'GET /api/v1/patients/:id is protected and returns 401 Unauthorized');

    const resPost = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Patient', age: 30, condition: 'Stable' }),
    });
    assert(resPost.status === 401, 'POST /api/v1/patients is protected and returns 401 Unauthorized');

    const resPatch = await fetch(`${baseUrl}/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition: 'Recovered' }),
    });
    assert(resPatch.status === 401, 'PATCH /api/v1/patients/:id is protected and returns 401 Unauthorized');

    const resDelete = await fetch(`${baseUrl}/${testId}`, { method: 'DELETE' });
    assert(resDelete.status === 401, 'DELETE /api/v1/patients/:id is protected and returns 401 Unauthorized');

    // Section 2: Zod Validation - Patient ID Param Schema
    const validIdResult = patientIdParamSchema.safeParse({ id: testId });
    assert(validIdResult.success, 'patientIdParamSchema accepts valid 24-character hexadecimal ObjectId');

    const invalidIdResult = patientIdParamSchema.safeParse({ id: 'invalid-id-123' });
    assert(
      !invalidIdResult.success && invalidIdResult.error.issues[0].message.includes('MongoDB ObjectId'),
      'patientIdParamSchema rejects malformed ObjectId format'
    );

    // Section 3: Zod Validation - Create Patient Schema
    const validPatient = {
      name: 'Rina Begum',
      age: 28,
      condition: 'Stable',
      doctor: testId,
    };
    const validPatientResult = createPatientSchema.safeParse(validPatient);
    assert(validPatientResult.success, 'createPatientSchema accepts complete, valid patient payload');

    const validUnassignedPatient = {
      name: 'Rina Begum',
      age: 28,
      condition: 'Stable',
      doctor: null,
    };
    assert(
      createPatientSchema.safeParse(validUnassignedPatient).success,
      'createPatientSchema accepts explicit doctor: null (unassigned patient)'
    );

    const missingFieldsResult = createPatientSchema.safeParse({});
    assert(
      !missingFieldsResult.success &&
        ['name', 'age', 'condition'].every((k) =>
          missingFieldsResult.error.issues.some((i) => i.path[0] === k)
        ),
      'createPatientSchema enforces name, age, and condition as required fields'
    );

    const badAgeResult = createPatientSchema.safeParse({
      name: 'Test Patient',
      age: 150, // exceeds 120 max
      condition: 'Stable',
    });
    assert(!badAgeResult.success, 'createPatientSchema rejects age exceeding 120 years');

    const negativeAgeResult = createPatientSchema.safeParse({
      name: 'Test Patient',
      age: -5,
      condition: 'Stable',
    });
    assert(!negativeAgeResult.success, 'createPatientSchema rejects negative age');

    const badConditionResult = createPatientSchema.safeParse({
      name: 'Test Patient',
      age: 30,
      condition: 'UnknownStatus',
    });
    assert(!badConditionResult.success, 'createPatientSchema rejects unsupported patient condition enum');

    const badDoctorRefResult = createPatientSchema.safeParse({
      name: 'Test Patient',
      age: 30,
      condition: 'Stable',
      doctor: 'invalid-doc-id',
    });
    assert(!badDoctorRefResult.success, 'createPatientSchema rejects malformed doctor ObjectId string');

    // Section 4: Zod Validation - Update Patient Schema
    const validUpdate = updatePatientSchema.safeParse({ condition: 'Critical' });
    assert(validUpdate.success, 'updatePatientSchema accepts partial field update');

    const validUnassignUpdate = updatePatientSchema.safeParse({ doctor: null });
    assert(
      validUnassignUpdate.success && validUnassignUpdate.data.doctor === null,
      'updatePatientSchema accepts explicit doctor: null for unassignment'
    );

    const emptyUpdateResult = updatePatientSchema.safeParse({});
    assert(!emptyUpdateResult.success, 'updatePatientSchema rejects empty update payloads');

    // Section 5: Zod Validation - Patient Query Parameters
    const defaultQuery = patientQuerySchema.parse({});
    assert(
      defaultQuery.page === 1 && defaultQuery.limit === 8,
      'patientQuerySchema applies default page=1, limit=8'
    );

    const unassignedQuery = patientQuerySchema.safeParse({ doctor: 'unassigned' });
    assert(unassignedQuery.success, "patientQuerySchema accepts doctor='unassigned' filter");

    const validDoctorQuery = patientQuerySchema.safeParse({ doctor: testId });
    assert(validDoctorQuery.success, 'patientQuerySchema accepts valid doctor ObjectId filter');

    const invalidDoctorQuery = patientQuerySchema.safeParse({ doctor: 'malformed-doc-id' });
    assert(!invalidDoctorQuery.success, 'patientQuerySchema rejects malformed doctor filter');

    const conditionFilterQuery = patientQuerySchema.safeParse({ condition: 'Observation' });
    assert(conditionFilterQuery.success, 'patientQuerySchema accepts valid condition filter');

    const coercedQuery = patientQuerySchema.parse({ page: '-10', limit: '300', dateRange: '90' });
    assert(
      coercedQuery.page === 1 && coercedQuery.limit === 100 && coercedQuery.dateRange === 90,
      'patientQuerySchema bounds page >= 1, limit <= 100, and coerces dateRange'
    );

    console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }
};

runPatientTests();
