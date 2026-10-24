import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { AppError } from '../utils/AppError';
import { CreateDoctorInput, UpdateDoctorInput, DoctorQueryInput } from '../validations/doctorValidation';

/**
 * GET /api/v1/doctors
 * Retrieves a paginated list of doctors with search, specialization, and date-based filtering.
 */
export const getDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as unknown as DoctorQueryInput;
    const page = query.page || 1;
    const limit = query.limit || 6;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // 1. Multi-field search (Name, Specialization, Hospital, Email)
    if (query.q) {
      const sanitized = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      filter.$or = [
        { name: searchRegex },
        { specialization: searchRegex },
        { hospital: searchRegex },
        { email: searchRegex },
      ];
    }

    // 2. Specialization filter
    if (query.specialization) {
      filter.specialization = query.specialization;
    }

    // 3. Date-based filtering (e.g., past 30, 90, 365 days)
    if (query.dateRange && query.dateRange > 0) {
      const pastDate = new Date(Date.now() - query.dateRange * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: pastDate };
    }

    const sortField = query.sortBy === 'name' ? 'name' : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    // Optimized aggregation: projects patient count without loading unbounded patient arrays
    const [doctors, totalCount] = await Promise.all([
      Doctor.aggregate([
        { $match: filter },
        { $sort: { [sortField]: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'patients',
            localField: '_id',
            foreignField: 'doctor',
            as: 'assignedPatients',
          },
        },
        {
          $addFields: {
            patientCount: { $size: '$assignedPatients' },
            id: '$_id',
          },
        },
        {
          $project: {
            assignedPatients: 0,
            __v: 0,
          },
        },
      ]),
      Doctor.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    res.status(200).json({
      success: true,
      data: {
        doctors,
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
 * GET /api/v1/doctors/:id
 * Retrieves doctor details along with their corresponding assigned patients.
 */
export const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doctor = await Doctor.findById(id).lean();
    if (!doctor) {
      throw new AppError('Doctor not found with the requested identifier', 404);
    }

    // Retrieve corresponding patients safely bounded
    const patients = await Patient.find({ doctor: id })
      .select('_id name age condition createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        doctor: {
          ...doctor,
          id: doctor._id,
          patientCount: patients.length,
          patients,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/doctors
 * Creates a new doctor record with uniqueness validation.
 */
export const createDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body: CreateDoctorInput = req.body;

    // Check email uniqueness before insert
    const normalizedEmail = body.email.toLowerCase().trim();
    const existing = await Doctor.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError('A doctor with this email address already exists.', 409);
    }

    const doctor = await Doctor.create({
      ...body,
      email: normalizedEmail,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: {
        doctor,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/doctors/:id
 * Updates an existing doctor's information.
 */
export const updateDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updates: UpdateDoctorInput = req.body;

    // Check email conflict if email is being modified
    if (updates.email) {
      const normalizedEmail = updates.email.toLowerCase().trim();
      const existing = await Doctor.findOne({
        email: normalizedEmail,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (existing) {
        throw new AppError('Another doctor already uses this email address.', 409);
      }
      updates.email = normalizedEmail;
    }

    const doctor = await Doctor.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!doctor) {
      throw new AppError('Doctor not found with the requested identifier', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: {
        doctor,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/doctors/:id
 * Deletes a doctor while unassigning their patients (setting doctor: null).
 */
export const deleteDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      throw new AppError('Doctor not found with the requested identifier', 404);
    }

    // Safely unassign all corresponding patients
    const updateResult = await Patient.updateMany(
      { doctor: doctor._id },
      { $set: { doctor: null } }
    );

    // Delete the doctor document
    await Doctor.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Doctor ${doctor.name} deleted successfully. ${updateResult.modifiedCount} assigned patient(s) have been set to unassigned.`,
    });
  } catch (error) {
    next(error);
  }
};
