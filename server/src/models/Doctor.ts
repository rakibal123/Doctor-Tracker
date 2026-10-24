import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      minlength: [2, 'Doctor name must be at least 2 characters long'],
      maxlength: [100, 'Doctor name cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    hospital: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      maxlength: [150, 'Hospital name cannot exceed 150 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+]?[0-9\s-]{7,20}$/, 'Please provide a valid phone number'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Please provide a valid email address'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual relationship to assigned patients (avoids embedding unbounded arrays)
doctorSchema.virtual('patients', {
  ref: 'Patient',
  localField: '_id',
  foreignField: 'doctor',
});

// Virtual count of assigned patients
doctorSchema.virtual('patientCount', {
  ref: 'Patient',
  localField: '_id',
  foreignField: 'doctor',
  count: true,
});

// Indexes for search, filtering, and pagination:
// Note: unique index on `email` is created by `unique: true` in schema.
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ createdAt: -1 });
doctorSchema.index(
  { name: 'text', hospital: 'text', email: 'text', specialization: 'text' },
  { name: 'doctor_text_search_index' }
);

// Pre-hook for document deletion to ensure assigned patients are unassigned rather than deleted
doctorSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    const Patient = mongoose.model('Patient');
    await Patient.updateMany({ doctor: this._id }, { $set: { doctor: null } });
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Doctor: Model<IDoctor> = mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', doctorSchema);
export default Doctor;
