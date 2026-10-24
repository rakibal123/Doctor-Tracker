import { Request, Response, NextFunction } from 'express';
import { Doctor } from '../models/Doctor';
import { Patient, PATIENT_CONDITIONS, PatientCondition } from '../models/Patient';

export interface MonthBucket {
  month: string;
  year: number;
  monthIndex: number; // 1-12
  count: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Builds a chronological array for the past 6 calendar months (oldest to current).
 * Ensures zero-filled counts if no data exists.
 */
export const buildSixMonthBuckets = (referenceDate = new Date()): MonthBucket[] => {
  const buckets: MonthBucket[] = [];
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth(); // 0-indexed (0 = Jan)

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    buckets.push({
      month: MONTH_NAMES[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      monthIndex: d.getUTCMonth() + 1,
      count: 0,
    });
  }

  return buckets;
};

/**
 * GET /api/v1/dashboard/stats
 * Aggregates high-level metrics, monthly admissions, doctor caseload, and clinical condition distribution.
 */
export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sixMonthBuckets = buildSixMonthBuckets(now);
    const sixMonthsStartDate = new Date(
      Date.UTC(sixMonthBuckets[0].year, sixMonthBuckets[0].monthIndex - 1, 1)
    );

    // 1. Parallel execution of optimized queries across collections
    const [
      totalDoctors,
      hospitals,
      patientFacetResult,
      monthlyAgg,
      caseloadAgg,
      recentPatients,
    ] = await Promise.all([
      // A. Total doctors count
      Doctor.countDocuments(),

      // B. Distinct hospitals count
      Doctor.distinct('hospital'),

      // C. Multi-faceted patient summary in a single database pass
      Patient.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            unassigned: [{ $match: { doctor: null } }, { $count: 'count' }],
            critical: [{ $match: { condition: 'Critical' } }, { $count: 'count' }],
            addedLast30Days: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              { $count: 'count' },
            ],
            addedLast7Days: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $count: 'count' },
            ],
            conditionCounts: [
              { $group: { _id: '$condition', count: { $sum: 1 } } },
            ],
          },
        },
      ]),

      // D. Monthly patient admissions aggregation (bounded to past 6 months)
      Patient.aggregate([
        { $match: { createdAt: { $gte: sixMonthsStartDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // E. Top doctors by assigned patient count & idle doctor identification
      Doctor.aggregate([
        {
          $lookup: {
            from: 'patients',
            localField: '_id',
            foreignField: 'doctor',
            as: 'assignedPatients',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            specialization: 1,
            patientCount: { $size: '$assignedPatients' },
          },
        },
        { $sort: { patientCount: -1, name: 1 } },
      ]),

      // F. Recent 5 patients feed with safe populated doctor details
      Patient.find()
        .select('_id name age condition doctor createdAt')
        .populate('doctor', '_id name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // 2. Extract facet results safely (handling empty collections)
    const facet = patientFacetResult[0] || {};
    const totalPatients = facet.total?.[0]?.count || 0;
    const unassignedPatients = facet.unassigned?.[0]?.count || 0;
    const criticalPatients = facet.critical?.[0]?.count || 0;
    const addedLast30Days = facet.addedLast30Days?.[0]?.count || 0;
    const addedLast7Days = facet.addedLast7Days?.[0]?.count || 0;

    // 3. Calculate patients per doctor & idle doctors safely
    const patientsPerDoctor = totalDoctors > 0 ? Number((totalPatients / totalDoctors).toFixed(1)) : 0;
    const idleDoctors = caseloadAgg.filter((d) => d.patientCount === 0).length;
    const topCaseloadDoctors = caseloadAgg.slice(0, 6).map((d) => ({
      id: d._id,
      name: d.name,
      specialization: d.specialization,
      patientCount: d.patientCount,
    }));

    // 4. Map monthly admissions into chronological buckets
    const monthlyMap = new Map<string, number>();
    for (const item of monthlyAgg) {
      const key = `${item._id.year}-${item._id.month}`;
      monthlyMap.set(key, item.count);
    }

    const monthlyAdmissions = sixMonthBuckets.map((bucket) => {
      const key = `${bucket.year}-${bucket.monthIndex}`;
      return {
        month: bucket.month,
        year: bucket.year,
        count: monthlyMap.get(key) || 0,
      };
    });

    // 5. Build condition breakdown for all enum values
    const conditionMap = new Map<string, number>();
    for (const item of facet.conditionCounts || []) {
      conditionMap.set(item._id, item.count);
    }

    const conditionBreakdown = PATIENT_CONDITIONS.map((cond: PatientCondition) => {
      const count = conditionMap.get(cond) || 0;
      const percentage = totalPatients > 0 ? Number(((count / totalPatients) * 100).toFixed(1)) : 0;
      return {
        condition: cond,
        count,
        percentage,
      };
    });

    // 6. Format response
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDoctors,
          totalHospitals: hospitals.length,
          totalPatients,
          criticalPatients,
          patientsPerDoctor,
          idleDoctors,
          unassignedPatients,
          addedLast30Days,
          addedLast7Days,
        },
        monthlyAdmissions,
        caseloadByDoctor: topCaseloadDoctors,
        conditionBreakdown,
        recentPatients: recentPatients.map((p) => ({
          id: p._id,
          name: p.name,
          age: p.age,
          condition: p.condition,
          doctor: p.doctor
            ? {
                id: (p.doctor as unknown as { _id: string; name: string })._id,
                name: (p.doctor as unknown as { _id: string; name: string }).name,
              }
            : null,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
