/**
 * Doctor Tracker - Dashboard TypeScript Definitions & Formatting Helpers
 * Matches the GET /api/v1/dashboard/stats backend contract and Doctor Tracker.html reference.
 */

export type PatientCondition = 'Stable' | 'Observation' | 'Critical' | 'Recovered';

export interface DashboardSummary {
  totalDoctors: number;
  totalHospitals: number;
  totalPatients: number;
  criticalPatients: number;
  patientsPerDoctor: number;
  idleDoctors: number;
  unassignedPatients: number;
  addedLast30Days: number;
  addedLast7Days: number;
}

export interface MonthlyAdmission {
  month: string;
  year: number;
  count: number;
}

export interface CaseloadDoctor {
  id: string;
  name: string;
  specialization: string;
  patientCount: number;
}

export interface ConditionBreakdown {
  condition: PatientCondition;
  count: number;
  percentage: number;
}

export interface RecentPatient {
  id: string;
  name: string;
  age: number;
  condition: PatientCondition;
  doctor: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthlyAdmissions: MonthlyAdmission[];
  caseloadByDoctor: CaseloadDoctor[];
  conditionBreakdown: ConditionBreakdown[];
  recentPatients: RecentPatient[];
}

export const CONDITION_LABELS: Record<PatientCondition, string> = {
  Stable: 'Stable',
  Observation: 'Under Observation',
  Critical: 'Critical',
  Recovered: 'Recovered',
};

export const CONDITION_COLORS: Record<PatientCondition, string> = {
  Stable: 'var(--sta, #16A34A)',
  Observation: 'var(--oba, #D97706)',
  Critical: 'var(--cra, #DC2626)',
  Recovered: 'var(--rca, #2563EB)',
};
