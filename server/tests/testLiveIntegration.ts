import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { env } from '../src/config/env';
import { User, Doctor, Patient } from '../src/models';

interface AssertCondition {
  (condition: boolean, message: string): void;
}

let passed = 0;
let failed = 0;

const assert: AssertCondition = (condition, message) => {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
};

const runLiveIntegration = async () => {
  console.log('=== Doctor Tracker Real MongoDB & HTTP Integration Verification ===\n');

  // 1. Establish real database connection
  await connectDB();
  console.log('Connected to live MongoDB database:', mongoose.connection.name);

  // 2. Start test HTTP server on port 5055
  const TEST_PORT = 5055;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  console.log(`Live test HTTP server listening on ${baseUrl}\n`);

  let authCookie = '';
  let testDoctorId = '';
  let testPatientId = '';
  let seededDoctorId = '';

  // Capture pre-test baseline counts from the real database
  const baselineAdminCount = await User.countDocuments({ role: 'admin' });
  const baselineDoctorCount = await Doctor.countDocuments();
  const baselinePatientCount = await Patient.countDocuments();
  const baselineUnassignedCount = await Patient.countDocuments({ doctor: null });
  console.log(`Live DB Baselines: Admins=${baselineAdminCount}, Doctors=${baselineDoctorCount}, Patients=${baselinePatientCount}, Unassigned=${baselineUnassignedCount}\n`);

  // Unique timestamp-based identifiers ensure isolated test runs without colliding with existing records
  const runTimestamp = Date.now();
  const testDoctorEmail = `audit.integration.${runTimestamp}@doctortracker.com`;
  const testDoctorName = `Dr. Audit Integration ${runTimestamp}`;
  const testPatientName = `Audit Patient ${runTimestamp}`;

  try {
    // ----------------------------------------------------
    // Cleanup any lingering records from previous test runs matching test patterns only
    // ----------------------------------------------------
    await Doctor.deleteMany({ email: { $regex: /^audit\.integration\.\d+@doctortracker\.com$|^real\.integration\.test@doctortracker\.com$/ } });
    await Patient.deleteMany({ name: { $regex: /^Audit Patient \d+|^Integration Test Patient Omega$/ } });

    // ----------------------------------------------------
    // Step 4.1: Health Endpoint
    // ----------------------------------------------------
    console.log('--- Step 4.1: Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthData.status === 'ok', 'Health response payload has status: "ok"');
    assert(healthData.service === 'doctor-tracker-api', 'Health payload identifies doctor-tracker-api service');
    assert(healthData.database === 'connected', 'Health payload reports database status is "connected"');

    // ----------------------------------------------------
    // Step 4.2: Auth & Protected Route Verification
    // ----------------------------------------------------
    console.log('\n--- Step 4.2: Auth & Protected Route Verification ---');
    
    // Protected routes reject unauthenticated requests
    const unauthDoctorsRes = await fetch(`${baseUrl}/api/v1/doctors`);
    assert(unauthDoctorsRes.status === 401, 'Unauthenticated GET /api/v1/doctors returns 401 Unauthorized');

    const unauthPatientsRes = await fetch(`${baseUrl}/api/v1/patients`);
    assert(unauthPatientsRes.status === 401, 'Unauthenticated GET /api/v1/patients returns 401 Unauthorized');

    const unauthDashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/stats`);
    assert(unauthDashboardRes.status === 401, 'Unauthenticated GET /api/v1/dashboard/stats returns 401 Unauthorized');

    const unauthMeRes = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert(unauthMeRes.status === 401, 'Unauthenticated GET /api/v1/auth/me returns 401 Unauthorized');

    // Admin login with seeded credentials
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.SEED_ADMIN_EMAIL,
        password: env.SEED_ADMIN_PASSWORD,
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Admin login returns HTTP 200');
    assert(loginData.success === true, 'Admin login response indicates success=true');
    assert(loginData.data.user.email === env.SEED_ADMIN_EMAIL.toLowerCase(), 'Admin user email matches in login response');
    assert(loginData.data.user.role === 'admin', 'Admin user role is "admin"');

    // Capture auth cookie from Set-Cookie header
    const rawCookie = loginRes.headers.get('set-cookie');
    assert(!!rawCookie && rawCookie.includes('token='), 'Login emits Set-Cookie header containing auth token');
    if (rawCookie) {
      authCookie = rawCookie.split(';')[0];
    }

    // Authenticated /auth/me call
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: authCookie },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Authenticated GET /api/v1/auth/me returns HTTP 200');
    assert(meData.data.user.email === env.SEED_ADMIN_EMAIL.toLowerCase(), '/auth/me returns current authenticated user email');

    // ----------------------------------------------------
    // Step 4.3: Dashboard Analytics with Live Records
    // ----------------------------------------------------
    console.log('\n--- Step 4.3: Dashboard Analytics with Live Records ---');
    const statsRes = await fetch(`${baseUrl}/api/v1/dashboard/stats`, {
      headers: { Cookie: authCookie },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'GET /api/v1/dashboard/stats returns HTTP 200');
    assert(statsData.data.summary.totalDoctors === baselineDoctorCount, `Total doctors matches current database baseline (${baselineDoctorCount})`);
    assert(statsData.data.summary.totalPatients === baselinePatientCount, `Total patients matches current database baseline (${baselinePatientCount})`);
    assert(Array.isArray(statsData.data.monthlyAdmissions) && statsData.data.monthlyAdmissions.length === 6, 'Monthly admissions contains exactly 6 chronological months');
    assert(Array.isArray(statsData.data.caseloadByDoctor), 'Patient caseload per doctor (caseloadByDoctor) is an array');
    assert(
      Array.isArray(statsData.data.conditionBreakdown) &&
      statsData.data.conditionBreakdown.some((c: any) => c.condition === 'Stable' && typeof c.count === 'number'),
      'Condition breakdown contains Stable condition count'
    );

    // ----------------------------------------------------
    // Step 4.4: Doctor Listing, Search, Filters, Pagination
    // ----------------------------------------------------
    console.log('\n--- Step 4.4: Doctor Listing, Search, Filters, Pagination ---');
    
    // Pagination (limit 6)
    const doctorsPage1Res = await fetch(`${baseUrl}/api/v1/doctors?page=1&limit=6`, {
      headers: { Cookie: authCookie },
    });
    const doctorsPage1 = await doctorsPage1Res.json();
    assert(doctorsPage1Res.status === 200, 'GET /api/v1/doctors?page=1&limit=6 returns HTTP 200');
    assert(doctorsPage1.data.doctors.length <= 6 && doctorsPage1.data.doctors.length > 0, `Page 1 returns up to 6 doctors (returned: ${doctorsPage1.data.doctors.length})`);
    assert(doctorsPage1.data.pagination.page === 1, 'Pagination reflects page=1');
    assert(doctorsPage1.data.pagination.limit === 6, 'Pagination reflects limit=6');
    assert(doctorsPage1.data.pagination.total === baselineDoctorCount, `Pagination reflects total doctor count (${baselineDoctorCount})`);

    // Store a seeded doctor id for subsequent tests
    seededDoctorId = doctorsPage1.data.doctors[0]._id;

    // Search by name (query param 'q')
    const searchDocRes = await fetch(`${baseUrl}/api/v1/doctors?q=Amina`, {
      headers: { Cookie: authCookie },
    });
    const searchDocData = await searchDocRes.json();
    assert(searchDocRes.status === 200, 'Search doctors by "q=Amina" returns HTTP 200');
    assert(searchDocData.data.doctors.some((d: any) => d.name.includes('Amina')), 'Search results contain Dr. Amina');

    // Filter by specialization
    const specDocRes = await fetch(`${baseUrl}/api/v1/doctors?specialization=Cardiology`, {
      headers: { Cookie: authCookie },
    });
    const specDocData = await specDocRes.json();
    assert(specDocRes.status === 200, 'Filter doctors by specialization Cardiology returns HTTP 200');
    assert(specDocData.data.doctors.every((d: any) => d.specialization === 'Cardiology'), 'All returned doctors match Cardiology specialization');

    // ----------------------------------------------------
    // Step 4.5: Doctor Creation, Detail View, and Editing
    // ----------------------------------------------------
    console.log('\n--- Step 4.5: Doctor Creation, Detail View, and Editing ---');
    const newDoctorPayload = {
      name: testDoctorName,
      specialization: 'Neurology',
      hospital: 'Apex Medical Center',
      phone: '+880 1799999999',
      email: testDoctorEmail,
    };

    const createDocRes = await fetch(`${baseUrl}/api/v1/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify(newDoctorPayload),
    });
    const createDocData = await createDocRes.json();
    assert(createDocRes.status === 201, 'POST /api/v1/doctors creates doctor with HTTP 201');
    assert(createDocData.data.doctor.name === newDoctorPayload.name, 'Created doctor name matches payload');
    testDoctorId = createDocData.data.doctor._id;

    // Delta assertion: doctor collection count increased by exactly 1
    const countAfterDocCreate = await Doctor.countDocuments();
    assert(countAfterDocCreate === baselineDoctorCount + 1, `Doctor count delta is +1 (${countAfterDocCreate} vs baseline ${baselineDoctorCount})`);

    // Retrieve doctor detail view
    const detailDocRes = await fetch(`${baseUrl}/api/v1/doctors/${testDoctorId}`, {
      headers: { Cookie: authCookie },
    });
    const detailDocData = await detailDocRes.json();
    assert(detailDocRes.status === 200, 'GET /api/v1/doctors/:id returns HTTP 200');
    assert(detailDocData.data.doctor._id === testDoctorId, 'Doctor detail returns correct ID');
    assert(
      Array.isArray(detailDocData.data.doctor.patients) && detailDocData.data.doctor.patients.length === 0,
      'New doctor has empty assigned patients array'
    );

    // Update doctor hospital
    const updateDocRes = await fetch(`${baseUrl}/api/v1/doctors/${testDoctorId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ hospital: 'Updated Apex Specialized Hospital' }),
    });
    const updateDocData = await updateDocRes.json();
    assert(updateDocRes.status === 200, 'PATCH /api/v1/doctors/:id returns HTTP 200');
    assert(updateDocData.data.doctor.hospital === 'Updated Apex Specialized Hospital', 'Doctor hospital successfully updated');

    // Verify DB persistence directly with Mongoose
    const dbDoctorCheck = await Doctor.findById(testDoctorId);
    assert(dbDoctorCheck?.hospital === 'Updated Apex Specialized Hospital', 'Doctor hospital change persisted in MongoDB document');

    // ----------------------------------------------------
    // Step 4.6: Patient Creation, Assignment, Reassignment, Unassignment
    // ----------------------------------------------------
    console.log('\n--- Step 4.6: Patient Creation, Assignment, Reassignment, Unassignment ---');
    const newPatientPayload = {
      name: testPatientName,
      age: 38,
      condition: 'Stable',
      doctor: testDoctorId,
    };

    const createPatRes = await fetch(`${baseUrl}/api/v1/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify(newPatientPayload),
    });
    const createPatData = await createPatRes.json();
    assert(createPatRes.status === 201, 'POST /api/v1/patients creates patient with HTTP 201');
    assert(createPatData.data.patient.name === newPatientPayload.name, 'Patient name matches payload');
    const assignedDocId = createPatData.data.patient.doctor?._id || createPatData.data.patient.doctor;
    assert(String(assignedDocId) === testDoctorId, 'Patient assigned to test doctor');
    testPatientId = createPatData.data.patient._id;

    // Delta assertion: patient collection count increased by exactly 1
    const countAfterPatCreate = await Patient.countDocuments();
    assert(countAfterPatCreate === baselinePatientCount + 1, `Patient count delta is +1 (${countAfterPatCreate} vs baseline ${baselinePatientCount})`);

    // Verify doctor detail view now lists this assigned patient
    const docWithPatientRes = await fetch(`${baseUrl}/api/v1/doctors/${testDoctorId}`, {
      headers: { Cookie: authCookie },
    });
    const docWithPatientData = await docWithPatientRes.json();
    assert(
      docWithPatientData.data.doctor.patients.some((p: any) => String(p._id) === testPatientId),
      'Doctor detail view includes newly assigned patient in doctor.patients array'
    );

    // Reassign patient to seeded doctor
    const reassignPatRes = await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ doctor: seededDoctorId }),
    });
    const reassignPatData = await reassignPatRes.json();
    assert(reassignPatRes.status === 200, 'Reassign patient to another doctor returns HTTP 200');
    const reassignedDocId = reassignPatData.data.patient.doctor?._id || reassignPatData.data.patient.doctor;
    assert(String(reassignedDocId) === seededDoctorId, 'Patient doctor ID updated to new doctor');

    // Unassign patient (doctor: null)
    const unassignPatRes = await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ doctor: null }),
    });
    const unassignPatData = await unassignPatRes.json();
    assert(unassignPatRes.status === 200, 'Unassign patient (doctor: null) returns HTTP 200');
    assert(unassignPatData.data.patient.doctor === null, 'Patient doctor field is now null (unassigned)');

    // Verify patient appears in unassigned filter
    const unassignedListRes = await fetch(`${baseUrl}/api/v1/patients?doctor=unassigned`, {
      headers: { Cookie: authCookie },
    });
    const unassignedListData = await unassignedListRes.json();
    assert(
      unassignedListData.data.patients.some((p: any) => String(p._id) === testPatientId),
      'Patient appears in GET /api/v1/patients?doctor=unassigned list'
    );

    // Re-assign patient back to test doctor for testing doctor deletion semantics
    await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({ doctor: testDoctorId }),
    });

    // ----------------------------------------------------
    // Step 4.7: Doctor Deletion Preserves Patients & Sets Doctor to Null
    // ----------------------------------------------------
    console.log('\n--- Step 4.7: Deleting Doctor Preserves Patient with Doctor=Null ---');
    const deleteDocRes = await fetch(`${baseUrl}/api/v1/doctors/${testDoctorId}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    });
    const deleteDocData = await deleteDocRes.json();
    assert(deleteDocRes.status === 200, 'DELETE /api/v1/doctors/:id returns HTTP 200');
    assert(deleteDocData.success === true, 'Doctor deletion response indicates success=true');

    // Delta assertion: doctor count returned to baseline
    const countAfterDocDelete = await Doctor.countDocuments();
    assert(countAfterDocDelete === baselineDoctorCount, `Doctor count returned to baseline after test doctor deletion (${countAfterDocDelete})`);

    // Confirm doctor document is gone
    const checkDeletedDocRes = await fetch(`${baseUrl}/api/v1/doctors/${testDoctorId}`, {
      headers: { Cookie: authCookie },
    });
    assert(checkDeletedDocRes.status === 404, 'Deleted doctor returns HTTP 404 on subsequent retrieval');

    // Confirm assigned patient STILL EXISTS in database and has doctor: null
    const checkPreservedPatRes = await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      headers: { Cookie: authCookie },
    });
    const checkPreservedPatData = await checkPreservedPatRes.json();
    assert(checkPreservedPatRes.status === 200, 'Patient record is preserved after doctor deletion (HTTP 200)');
    assert(checkPreservedPatData.data.patient.doctor === null, 'Patient doctor reference is automatically set to null');

    // Direct MongoDB verification
    const dbPreservedPatient = await Patient.findById(testPatientId);
    assert(dbPreservedPatient !== null, 'Patient document confirmed present in MongoDB');
    assert(dbPreservedPatient?.doctor === null, 'Patient document doctor field in MongoDB is explicitly null');

    // ----------------------------------------------------
    // Step 4.8: Permanently Deleting a Patient from Global Patients Page
    // ----------------------------------------------------
    console.log('\n--- Step 4.8: Permanently Deleting Patient Record ---');
    const deletePatRes = await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      method: 'DELETE',
      headers: { Cookie: authCookie },
    });
    const deletePatData = await deletePatRes.json();
    assert(deletePatRes.status === 200, 'DELETE /api/v1/patients/:id returns HTTP 200');
    assert(deletePatData.success === true, 'Patient deletion response indicates success=true');

    // Delta assertion: patient count returned to baseline
    const countAfterPatDelete = await Patient.countDocuments();
    assert(countAfterPatDelete === baselinePatientCount, `Patient count returned to baseline after test patient deletion (${countAfterPatDelete})`);

    // Confirm patient is permanently deleted
    const checkDeletedPatRes = await fetch(`${baseUrl}/api/v1/patients/${testPatientId}`, {
      headers: { Cookie: authCookie },
    });
    assert(checkDeletedPatRes.status === 404, 'Deleted patient returns HTTP 404 on subsequent retrieval');

    const dbDeletedPatient = await Patient.findById(testPatientId);
    assert(dbDeletedPatient === null, 'Patient document confirmed removed from MongoDB');

    // ----------------------------------------------------
    // Step 4.9: Error Handling, Invalid Inputs, Edge Cases
    // ----------------------------------------------------
    console.log('\n--- Step 4.9: Error Handling, Invalid Inputs, Edge Cases ---');

    // Login with incorrect password
    const badLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.SEED_ADMIN_EMAIL,
        password: 'wrong_password_123',
      }),
    });
    assert(badLoginRes.status === 401, 'Invalid password returns HTTP 401');

    // Validation error on doctor creation (malformed email)
    const badDocRes = await fetch(`${baseUrl}/api/v1/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        name: 'Dr. Invalid Email',
        specialization: 'Neurology',
        hospital: 'Test Hospital',
        phone: '+880 1711111111',
        email: 'not-a-valid-email',
      }),
    });
    assert(badDocRes.status === 400, 'Malformed email in doctor creation returns HTTP 400 validation error');

    // Validation error on patient creation (negative age)
    const badPatRes = await fetch(`${baseUrl}/api/v1/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        name: 'Invalid Age Patient',
        age: -5,
        condition: 'Stable',
      }),
    });
    assert(badPatRes.status === 400, 'Negative age in patient creation returns HTTP 400 validation error');

    // Non-existent resource ID (valid ObjectId format)
    const nonExistentDocRes = await fetch(`${baseUrl}/api/v1/doctors/65f000000000000000000000`, {
      headers: { Cookie: authCookie },
    });
    assert(nonExistentDocRes.status === 404, 'Non-existent doctor ObjectId returns HTTP 404');

    // Logout endpoint
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert(logoutRes.status === 200, 'POST /api/v1/auth/logout returns HTTP 200');
    assert(
      !!logoutCookie && (logoutCookie.includes('token=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('Expires=Thu, 01 Jan 1970')),
      'Logout emits expired cookie header to clear client token'
    );

    // ----------------------------------------------------
    // Final Database Integrity Check
    // ----------------------------------------------------
    console.log('\n--- Final Database Verification & Cleanup Confirmation ---');
    const finalAdmins = await User.countDocuments({ role: 'admin' });
    const finalDoctors = await Doctor.countDocuments();
    const finalPatients = await Patient.countDocuments();
    const finalUnassigned = await Patient.countDocuments({ doctor: null });

    assert(finalAdmins === baselineAdminCount, `Final admin user count (${finalAdmins}) matches baseline (${baselineAdminCount})`);
    assert(finalDoctors === baselineDoctorCount, `Final doctor count (${finalDoctors}) matches baseline (${baselineDoctorCount}) (all real doctor records intact)`);
    assert(finalPatients === baselinePatientCount, `Final patient count (${finalPatients}) matches baseline (${baselinePatientCount}) (all real patient records intact)`);
    assert(finalUnassigned === baselineUnassignedCount, `Final unassigned patient count (${finalUnassigned}) matches baseline (${baselineUnassignedCount})`);

  } finally {
    // Isolated cleanup: safely delete only records created by this test run if any remain
    try {
      if (testDoctorId) {
        await Doctor.deleteOne({ _id: testDoctorId });
      }
      if (testPatientId) {
        await Patient.deleteOne({ _id: testPatientId });
      }
    } catch (cleanupErr) {
      console.warn('Warning: Error cleaning up isolated test records:', cleanupErr);
    }

    // Gracefully shut down server and database
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('\nTest HTTP server and MongoDB connection closed.');
  }

  console.log(`\n========================================`);
  console.log(`Live Integration Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runLiveIntegration().catch((err) => {
  console.error('Unhandled integration test failure:', err);
  process.exit(1);
});
