import mongoose, { Document, Model, Schema } from 'mongoose';
import { IDoctor } from './Doctor';

export type PatientCondition = 'Stable' | 'Observation' | 'Critical' | 'Recovered';

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  age: number;
  condition: PatientCondition;
  doctor: mongoose.Types.ObjectId | IDoctor | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PATIENT_CONDITIONS: [PatientCondition, ...PatientCondition[]] = [
  'Stable',
  'Observation',
  'Critical',
  'Recovered',
];

const patientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      minlength: [2, 'Patient name must be at least 2 characters long'],
      maxlength: [100, 'Patient name cannot exceed 100 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
      max: [120, 'Age cannot exceed 120 years'],
    },
    condition: {
      type: String,
      required: [true, 'Patient condition is required'],
      enum: {
        values: PATIENT_CONDITIONS,
        message: '{VALUE} is not a supported patient condition',
      },
      default: 'Stable',
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null, // Null indicates unassigned patient
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes optimized for filtering, pagination, and foreign-key joins:
patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ doctor: 1, condition: 1, createdAt: -1 });
patientSchema.index({ name: 'text' }, { name: 'patient_name_text_index' });

export const Patient: Model<IPatient> = mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);
export default Patient;
