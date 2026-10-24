import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { AppError } from '../utils/AppError';
import {
  CreatePatientInput,
  UpdatePatientInput,
  PatientQueryInput,
} from '../validations/patientValidation';

/**
 * GET /api/v1/patients
 * Retrieves a paginated list of patients with search, condition filter, doctor filter, and date-range filter.
 */
export const getPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as unknown as PatientQueryInput;
    const page = query.page || 1;
    const limit = query.limit || 8;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // 1. Search by patient name
    if (query.q) {
      const sanitized = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: sanitized, $options: 'i' };
    }

    // 2. Condition filter (Stable, Observation, Critical, Recovered)
    if (query.condition) {
      filter.condition = query.condition;
    }

    // 3. Assigned doctor filter (supports specific doctor ID or unassigned status)
    if (query.doctor) {
      if (query.doctor === 'unassigned' || query.doctor === 'null') {
        filter.doctor = null;
      } else {
        filter.doctor = new mongoose.Types.ObjectId(query.doctor);
      }
    }

    // 4. Date-based filtering (e.g., past 30, 90 days)
    if (query.dateRange && query.dateRange > 0) {
      const pastDate = new Date(Date.now() - query.dateRange * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: pastDate };
    }

    const sortField = query.sortBy === 'name' ? 'name' : query.sortBy === 'age' ? 'age' : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    // Indexed pagination with lean populated doctor metadata
    const [patients, totalCount] = await Promise.all([
      Patient.find(filter)
        .select('_id name age condition doctor createdAt updatedAt')
        .populate('doctor', '_id name specialization hospital email phone')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    res.status(200).json({
      success: true,
      data: {
        patients: patients.map((p) => ({
          ...p,
          id: p._id,
        })),
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/patients/:id
 * Retrieves a single patient by ID with assigned doctor details.
 */
export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const patient = await Patient.findById(id)
      .select('_id name age condition doctor createdAt updatedAt')
      .populate('doctor', '_id name specialization hospital email phone')
      .lean();

    if (!patient) {
      throw new AppError('Patient not found with the requested identifier', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        patient: {
          ...patient,
          id: patient._id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/patients
 * Creates a new patient record. Verifies referenced doctor exists if provided.
 */
export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body: CreatePatientInput = req.body;

    // Verify referenced doctor exists if assigned
    if (body.doctor) {
      const doctorExists = await Doctor.findById(body.doctor);
      if (!doctorExists) {
        throw new AppError('The referenced doctor does not exist.', 404);
      }
    }

    const patient = await Patient.create({
      name: body.name,
      age: body.age,
      condition: body.condition,
      doctor: body.doctor ? new mongoose.Types.ObjectId(body.doctor) : null,
    });

    const populated = await patient.populate('doctor', '_id name specialization hospital email phone');

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: {
        patient: populated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/patients/:id
 * Updates patient information. Supports assigning, reassigning, or explicitly unassigning (doctor: null).
 */
export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updates: UpdatePatientInput = req.body;

    // Handle doctor assignment/reassignment verification
    if (updates.doctor !== undefined) {
      if (updates.doctor !== null) {
        const doctorExists = await Doctor.findById(updates.doctor);
        if (!doctorExists) {
          throw new AppError('The referenced doctor does not exist.', 404);
        }
      }
    }

    const patient = await Patient.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('doctor', '_id name specialization hospital email phone');

    if (!patient) {
      throw new AppError('Patient not found with the requested identifier', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: {
        patient,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/patients/:id
 * Permanently deletes the selected patient. Leaves assigned doctor intact.
 */
export const deletePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const patient = await Patient.findByIdAndDelete(id);
    if (!patient) {
      throw new AppError('Patient not found with the requested identifier', 404);
    }

    res.status(200).json({
      success: true,
      message: `Patient ${patient.name} permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};
