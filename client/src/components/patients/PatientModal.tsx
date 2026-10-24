'use client';

import React, { useState, useEffect } from 'react';
import { Patient, CreatePatientPayload } from '../../types/patient';
import { validatePatientPayload } from '../../utils/validators';
import { PatientCondition } from '../../types/dashboard';
import { Doctor, DoctorListResponse } from '../../types/doctor';
import { api, ApiError } from '../../lib/api';
import { Icon } from '../layout/Icons';

interface PatientModalProps {
  isOpen: boolean;
  patient?: Patient | null; // If provided, edit mode; otherwise, add mode
  doctorsList?: Doctor[];
  onClose: () => void;
  onSuccess: (savedPatient: Patient, message: string) => void;
}

interface PatientFormProps {
  patient?: Patient | null;
  doctorsList?: Doctor[];
  onClose: () => void;
  onSuccess: (savedPatient: Patient, message: string) => void;
}

const CONDITION_OPTIONS: { value: PatientCondition; label: string }[] = [
  { value: 'Stable', label: 'Stable' },
  { value: 'Observation', label: 'Under Observation' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Recovered', label: 'Recovered' },
];

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  doctorsList = [],
  onClose,
  onSuccess,
}) => {
  const isEditing = !!patient;

  const [name, setName] = useState(patient?.name || '');
  const [age, setAge] = useState<string>(patient ? String(patient.age) : '');
  const [condition, setCondition] = useState<PatientCondition>(patient?.condition || 'Stable');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    patient?.doctor ? patient.doctor._id || patient.doctor.id || '' : ''
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const payload: Partial<CreatePatientPayload> = {
      name: name.trim(),
      age: age.trim() === '' ? undefined : Number(age.trim()),
      condition,
      doctor: selectedDoctorId ? selectedDoctorId : null,
    };

    // Client-side field validation
    const errors = validatePatientPayload(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const sanitizedPayload = {
        name: payload.name!,
        age: payload.age!,
        condition: payload.condition!,
        doctor: payload.doctor, // explicitly string or null
      };

      if (isEditing && patient) {
        const patientId = patient.id || patient._id;
        const res = await api.patch<{ patient: Patient }>(`/patients/${patientId}`, sanitizedPayload);
        const updated = res.data?.patient || {
          ...patient,
          ...sanitizedPayload,
          doctor: doctorsList.find((d) => (d.id || d._id) === sanitizedPayload.doctor) || null,
        };
        onSuccess(updated, 'Patient record updated successfully.');
      } else {
        const res = await api.post<{ patient: Patient }>('/patients', sanitizedPayload);
        if (!res.data?.patient) {
          throw new ApiError('Unexpected response format received from patient creation endpoint.');
        }
        onSuccess(res.data.patient, 'Patient registered successfully.');
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setFieldErrors(err.errors);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred while saving the patient record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dlg" onClick={(e) => e.stopPropagation()}>
      {/* Modal Header */}
      <div className="dh">
        <h2 id="patient_modal_title">{isEditing ? 'Edit patient' : 'Add patient'}</h2>
        <button
          type="button"
          className="btn ib"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close dialog"
          style={{ border: 0 }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="db">
          {generalError && (
            <div className="alert" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="alert" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="row">
            <label className="fl" htmlFor="p_name">
              Full name
            </label>
            <input
              className={`inp ${fieldErrors.name ? 'bad' : ''}`}
              id="p_name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="John Doe"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <div className="er" role="alert">
                {fieldErrors.name}
              </div>
            )}
          </div>

          {/* Age */}
          <div className="row">
            <label className="fl" htmlFor="p_age">
              Age
            </label>
            <input
              className={`inp ${fieldErrors.age ? 'bad' : ''}`}
              id="p_age"
              type="number"
              min="0"
              max="120"
              inputMode="numeric"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: '' }));
              }}
              placeholder="34"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.age}
            />
            {fieldErrors.age && (
              <div className="er" role="alert">
                {fieldErrors.age}
              </div>
            )}
          </div>

          {/* Clinical Condition */}
          <div className="row">
            <label className="fl" htmlFor="p_cond">
              Condition
            </label>
            <select
              className={`inp ${fieldErrors.condition ? 'bad' : ''}`}
              id="p_cond"
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value as PatientCondition);
                if (fieldErrors.condition) setFieldErrors((prev) => ({ ...prev, condition: '' }));
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.condition}
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.condition && (
              <div className="er" role="alert">
                {fieldErrors.condition}
              </div>
            )}
          </div>

          {/* Assigned Doctor */}
          <div className="row" style={{ marginBottom: 0 }}>
            <label className="fl" htmlFor="p_doc">
              Assigned Doctor
            </label>
            <select
              className={`inp ${fieldErrors.doctor ? 'bad' : ''}`}
              id="p_doc"
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                if (fieldErrors.doctor) setFieldErrors((prev) => ({ ...prev, doctor: '' }));
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.doctor}
            >
              <option value="">Unassigned</option>
              {doctorsList.map((d) => (
                <option key={d.id || d._id} value={d.id || d._id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
            {fieldErrors.doctor && (
              <div className="er" role="alert">
                {fieldErrors.doctor}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="df">
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn p"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spin" aria-hidden="true" style={{ width: 16, height: 16, marginRight: 8 }} />
                <span>Saving...</span>
              </>
            ) : (
              isEditing ? 'Save changes' : 'Add patient'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  patient,
  doctorsList = [],
  onClose,
  onSuccess,
}) => {
  const [internalDoctors, setInternalDoctors] = useState<Doctor[]>(doctorsList);

  // If doctorsList was not provided, fetch available doctors for the dropdown
  useEffect(() => {
    if (!isOpen) return;
    if (doctorsList.length > 0) {
      return;
    }

    let isMounted = true;
    api.get<DoctorListResponse>('/doctors?limit=100').then((res) => {
      if (isMounted && res.data?.doctors) {
        setInternalDoctors(res.data.doctors);
      }
    }).catch((err) => {
      console.warn('Could not load doctors list for patient assignment modal:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, doctorsList]);

  const activeDoctors = doctorsList.length > 0 ? doctorsList : internalDoctors;

  if (!isOpen) return null;

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient_modal_title"
      onClick={onClose}
    >
      <PatientForm
        key={patient?.id || patient?._id || 'new-patient'}
        patient={patient}
        doctorsList={activeDoctors}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};
