import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db';
import { env } from '../src/config/env';
import { User, Doctor, Patient, PatientCondition } from '../src/models';

/**
 * Calculates a relative past date from the current moment.
 * Ensures seed data creates realistic distributions for dashboard analytics and date-range filters.
 */
const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * 12 Realistic Doctors matching the prototype and assignment specifications.
 * Stable identifier: email (unique index in schema).
 */
const SEED_DOCTORS = [
  {
    name: 'Dr. Amina Rahman',
    specialization: 'Cardiology',
    hospital: 'Square Hospital',
    phone: '+880 1712345671',
    email: 'amina.rahman@doctortracker.com',
    createdAt: daysAgo(120),
  },
  {
    name: 'Dr. Tanvir Hossain',
    specialization: 'Neurology',
    hospital: 'United Hospital',
    phone: '+880 1712345672',
    email: 'tanvir.hossain@doctortracker.com',
    createdAt: daysAgo(105),
  },
  {
    name: 'Dr. Nusrat Jahan',
    specialization: 'Pediatrics',
    hospital: 'Evercare Hospital',
    phone: '+880 1712345673',
    email: 'nusrat.jahan@doctortracker.com',
    createdAt: daysAgo(95),
  },
  {
    name: 'Dr. Farhan Ahmed',
    specialization: 'Orthopedics',
    hospital: 'Labaid Hospital',
    phone: '+880 1712345674',
    email: 'farhan.ahmed@doctortracker.com',
    createdAt: daysAgo(85),
  },
  {
    name: 'Dr. Sabrina Karim',
    specialization: 'Dermatology',
    hospital: 'Popular Medical',
    phone: '+880 1712345675',
    email: 'sabrina.karim@doctortracker.com',
    createdAt: daysAgo(75),
  },
  {
    name: 'Dr. Imran Chowdhury',
    specialization: 'Oncology',
    hospital: 'Apollo Hospital',
    phone: '+880 1712345676',
    email: 'imran.chowdhury@doctortracker.com',
    createdAt: daysAgo(65),
  },
  {
    name: 'Dr. Laila Sultana',
    specialization: 'Gynecology',
    hospital: 'Square Hospital',
    phone: '+880 1712345677',
    email: 'laila.sultana@doctortracker.com',
    createdAt: daysAgo(55),
  },
  {
    name: 'Dr. Rafiq Islam',
    specialization: 'Cardiology',
    hospital: 'Ibn Sina Hospital',
    phone: '+880 1712345678',
    email: 'rafiq.islam@doctortracker.com',
    createdAt: daysAgo(45),
  },
  {
    name: 'Dr. Maliha Noor',
    specialization: 'Psychiatry',
    hospital: 'United Hospital',
    phone: '+880 1712345679',
    email: 'maliha.noor@doctortracker.com',
    createdAt: daysAgo(35),
  },
  {
    name: 'Dr. Kamal Uddin',
    specialization: 'Urology',
    hospital: 'Labaid Hospital',
    phone: '+880 1712345680',
    email: 'kamal.uddin@doctortracker.com',
    createdAt: daysAgo(25),
  },
  {
    name: 'Dr. Shirin Akter',
    specialization: 'Endocrinology',
    hospital: 'Evercare Hospital',
    phone: '+880 1712345681',
    email: 'shirin.akter@doctortracker.com',
    createdAt: daysAgo(15),
  },
  {
    name: 'Dr. Zahid Hasan',
    specialization: 'Pulmonology',
    hospital: 'Popular Medical',
    phone: '+880 1712345682',
    email: 'zahid.hasan@doctortracker.com',
    createdAt: daysAgo(5),
  },
];

/**
 * 30 Distinct, Realistic Patients covering all conditions and doctors.
 * Patients 0-25 are assigned across the 12 doctors.
 * Patients 26-29 are intentionally unassigned (doctorIndex: null).
 * Stable identifier: { name, age } pair.
 */
interface SeedPatientDefinition {
  name: string;
  age: number;
  condition: PatientCondition;
  doctorIndex: number | null;
  createdAt: Date;
}

const SEED_PATIENTS: SeedPatientDefinition[] = [
  { name: 'Rina Begum', age: 28, condition: 'Stable', doctorIndex: 0, createdAt: daysAgo(115) },
  { name: 'Hasan Khan', age: 45, condition: 'Recovered', doctorIndex: 0, createdAt: daysAgo(98) },
  { name: 'Mehedi Mia', age: 32, condition: 'Critical', doctorIndex: 0, createdAt: daysAgo(12) },
  { name: 'Sadia Begum', age: 61, condition: 'Observation', doctorIndex: 1, createdAt: daysAgo(92) },
  { name: 'Arif Chowdhury', age: 54, condition: 'Observation', doctorIndex: 1, createdAt: daysAgo(42) },
  { name: 'Tania Ahmed', age: 23, condition: 'Stable', doctorIndex: 2, createdAt: daysAgo(88) },
  { name: 'Nayeem Rahman', age: 40, condition: 'Recovered', doctorIndex: 3, createdAt: daysAgo(80) },
  { name: 'Farzana Sultana', age: 57, condition: 'Critical', doctorIndex: 3, createdAt: daysAgo(6) },
  { name: 'Shakib Al Hasan', age: 74, condition: 'Critical', doctorIndex: 4, createdAt: daysAgo(70) },
  { name: 'Mitu Akter', age: 21, condition: 'Observation', doctorIndex: 5, createdAt: daysAgo(60) },
  { name: 'Rakib Khan', age: 38, condition: 'Stable', doctorIndex: 6, createdAt: daysAgo(50) },
  { name: 'Jui Mia', age: 55, condition: 'Recovered', doctorIndex: 7, createdAt: daysAgo(40) },
  { name: 'Sohel Rana', age: 42, condition: 'Recovered', doctorIndex: 8, createdAt: daysAgo(32) },
  { name: 'Parvin Begum', age: 19, condition: 'Critical', doctorIndex: 9, createdAt: daysAgo(22) },
  { name: 'Tushar Mia', age: 36, condition: 'Observation', doctorIndex: 10, createdAt: daysAgo(14) },
  { name: 'Shamim Hossain', age: 50, condition: 'Stable', doctorIndex: 11, createdAt: daysAgo(4) },
  { name: 'Bilkis Banu', age: 68, condition: 'Stable', doctorIndex: 0, createdAt: daysAgo(72) },
  { name: 'Kamal Hossain', age: 17, condition: 'Recovered', doctorIndex: 1, createdAt: daysAgo(28) },
  { name: 'Nasima Akter', age: 34, condition: 'Critical', doctorIndex: 2, createdAt: daysAgo(18) },
  { name: 'Delwar Jahan', age: 49, condition: 'Observation', doctorIndex: 3, createdAt: daysAgo(38) },
  { name: 'Shirin Sultana', age: 63, condition: 'Observation', doctorIndex: 4, createdAt: daysAgo(16) },
  { name: 'Anisur Rahman', age: 29, condition: 'Stable', doctorIndex: 5, createdAt: daysAgo(24) },
  { name: 'Taslima Nasrin', age: 37, condition: 'Recovered', doctorIndex: 6, createdAt: daysAgo(20) },
  { name: 'Mahmudul Hasan', age: 48, condition: 'Critical', doctorIndex: 7, createdAt: daysAgo(8) },
  { name: 'Rehana Parvin', age: 66, condition: 'Critical', doctorIndex: 8, createdAt: daysAgo(2) },
  { name: 'Ashikur Rahman', age: 25, condition: 'Observation', doctorIndex: 9, createdAt: daysAgo(10) },
  // Unassigned patients (doctorIndex: null)
  { name: 'Sumona Haque', age: 30, condition: 'Stable', doctorIndex: null, createdAt: daysAgo(45) },
  { name: 'Morshed Alam', age: 47, condition: 'Recovered', doctorIndex: null, createdAt: daysAgo(30) },
  { name: 'Rubina Yasmin', age: 35, condition: 'Observation', doctorIndex: null, createdAt: daysAgo(15) },
  { name: 'Faisal Ahmed', age: 11, condition: 'Critical', doctorIndex: null, createdAt: daysAgo(1) },
];

export const runSeeder = async (): Promise<void> => {
  console.log('--- Doctor Tracker Database Seeder ---');
  console.log(`Connecting to MongoDB at: ${env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')} ...`);

  try {
    await connectDB();
  } catch (connError) {
    console.error('\n[DATABASE CONNECTION ERROR]');
    console.error('Cannot run seeder because MongoDB is currently unreachable.');
    console.error('Diagnostic error:', connError instanceof Error ? connError.message : connError);
    console.error('\nRemediation Steps:');
    console.error('1. If running locally: ensure MongoDB is started (e.g., sudo systemctl start mongod or start local daemon).');
    console.error('2. If using MongoDB Atlas: set MONGODB_URI in server/.env with your valid connection string.');
    process.exit(1);
  }

  try {
    // 1. Seed / Upsert Admin User (Safe & Idempotent)
    const adminEmail = env.SEED_ADMIN_EMAIL.toLowerCase().trim();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, salt);

    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✓ Admin user verified/upserted: ${adminEmail} (password hashed with bcrypt)`);

    // 2. Seed / Upsert 12 Doctors (Safe & Idempotent by unique email)
    const savedDoctors = [];
    for (const doc of SEED_DOCTORS) {
      const savedDoc = await Doctor.findOneAndUpdate(
        { email: doc.email.toLowerCase() },
        { ...doc, email: doc.email.toLowerCase() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedDoctors.push(savedDoc);
    }
    console.log(`✓ ${savedDoctors.length} doctors verified/upserted successfully`);

    // 3. Seed / Upsert 30 Patients (Safe & Idempotent by { name, age })
    let assignedCount = 0;
    let unassignedCount = 0;

    for (const pat of SEED_PATIENTS) {
      const doctorId = pat.doctorIndex !== null ? savedDoctors[pat.doctorIndex]._id : null;
      if (doctorId) {
        assignedCount++;
      } else {
        unassignedCount++;
      }

      await Patient.findOneAndUpdate(
        { name: pat.name, age: pat.age },
        {
          name: pat.name,
          age: pat.age,
          condition: pat.condition,
          doctor: doctorId,
          createdAt: pat.createdAt,
          updatedAt: pat.createdAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(
      `✓ ${SEED_PATIENTS.length} patients verified/upserted (${assignedCount} assigned, ${unassignedCount} unassigned)`
    );

    // 4. Final verification counts
    const totalUsers = await User.countDocuments({ role: 'admin' });
    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await Patient.countDocuments();
    const unassignedPatients = await Patient.countDocuments({ doctor: null });

    console.log('\n--- Seeder Summary ---');
    console.log(`Total Admin Users : ${totalUsers}`);
    console.log(`Total Doctors     : ${totalDoctors}`);
    console.log(`Total Patients    : ${totalPatients} (${unassignedPatients} unassigned)`);
    console.log('Database seeding completed successfully without dropping any data.');

    await disconnectDB();
    process.exit(0);
  } catch (seedError) {
    console.error('Error during seeding execution:', seedError);
    await disconnectDB();
    process.exit(1);
  }
};

// Run directly when invoked via CLI
if (require.main === module) {
  runSeeder();
}
