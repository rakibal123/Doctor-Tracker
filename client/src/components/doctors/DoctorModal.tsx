'use client';

import React, { useState, useEffect } from 'react';
import { Doctor, CreateDoctorPayload } from '../../types/doctor';
import { validateDoctorPayload } from '../../utils/validators';
import { api, ApiError } from '../../lib/api';
import { Icon } from '../layout/Icons';

interface DoctorModalProps {
  isOpen: boolean;
  doctor?: Doctor | null;
  onClose: () => void;
  onSuccess: (savedDoctor: Doctor, message: string) => void;
}

interface DoctorFormProps {
  doctor?: Doctor | null;
  onClose: () => void;
  onSuccess: (savedDoctor: Doctor, message: string) => void;
}

const DoctorForm: React.FC<DoctorFormProps> = ({ doctor, onClose, onSuccess }) => {
  const isEditing = !!doctor;

  const [name, setName] = useState(doctor?.name || '');
  const [specialization, setSpecialization] = useState(doctor?.specialization || '');
  const [hospital, setHospital] = useState(doctor?.hospital || '');
  const [phone, setPhone] = useState(doctor?.phone || '');
  const [email, setEmail] = useState(doctor?.email || '');

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

    const payload: CreateDoctorPayload = {
      name: name.trim(),
      specialization: specialization.trim(),
      hospital: hospital.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
    };

    // 1. Client-side field validation
    const errors = validateDoctorPayload(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (isEditing && doctor) {
        const res = await api.patch<{ doctor: Doctor }>(`/doctors/${doctor.id || doctor._id}`, payload);
        const updated = res.data?.doctor || { ...doctor, ...payload };
        onSuccess(updated, 'Doctor updated successfully.');
      } else {
        const res = await api.post<{ doctor: Doctor }>('/doctors', payload);
        if (!res.data?.doctor) {
          throw new ApiError('Unexpected response from doctor creation endpoint.');
        }
        onSuccess(res.data.doctor, 'Doctor added successfully.');
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setFieldErrors(err.errors);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('An unexpected error occurred while saving the doctor record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dlg" onClick={(e) => e.stopPropagation()}>
      {/* Modal Header */}
      <div className="dh">
        <h2 id="modal_title">{isEditing ? 'Edit doctor' : 'Add doctor'}</h2>
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

      {/* Modal Form Body */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="db">
          {generalError && (
            <div className="alert" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="alert" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Name Field */}
          <div className="row">
            <label className="fl" htmlFor="m_name">
              Full name
            </label>
            <input
              className={`inp ${fieldErrors.name ? 'bad' : ''}`}
              id="m_name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Dr. Sarah Connor"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <div className="er" role="alert">
                {fieldErrors.name}
              </div>
            )}
          </div>

          {/* Specialization Field */}
          <div className="row">
            <label className="fl" htmlFor="m_spec">
              Specialization
            </label>
            <input
              className={`inp ${fieldErrors.specialization ? 'bad' : ''}`}
              id="m_spec"
              type="text"
              value={specialization}
              onChange={(e) => {
                setSpecialization(e.target.value);
                if (fieldErrors.specialization) setFieldErrors((prev) => ({ ...prev, specialization: '' }));
              }}
              placeholder="Cardiology"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.specialization}
            />
            {fieldErrors.specialization && (
              <div className="er" role="alert">
                {fieldErrors.specialization}
              </div>
            )}
          </div>

          {/* Hospital Field */}
          <div className="row">
            <label className="fl" htmlFor="m_hosp">
              Hospital
            </label>
            <input
              className={`inp ${fieldErrors.hospital ? 'bad' : ''}`}
              id="m_hosp"
              type="text"
              value={hospital}
              onChange={(e) => {
                setHospital(e.target.value);
                if (fieldErrors.hospital) setFieldErrors((prev) => ({ ...prev, hospital: '' }));
              }}
              placeholder="City General Hospital"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.hospital}
            />
            {fieldErrors.hospital && (
              <div className="er" role="alert">
                {fieldErrors.hospital}
              </div>
            )}
          </div>

          {/* Phone Field */}
          <div className="row">
            <label className="fl" htmlFor="m_phone">
              Phone
            </label>
            <input
              className={`inp ${fieldErrors.phone ? 'bad' : ''}`}
              id="m_phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="+880 1711 000000"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.phone}
            />
            {fieldErrors.phone && (
              <div className="er" role="alert">
                {fieldErrors.phone}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="row" style={{ marginBottom: 0 }}>
            <label className="fl" htmlFor="m_email">
              Email
            </label>
            <input
              className={`inp ${fieldErrors.email ? 'bad' : ''}`}
              id="m_email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="sconnor@hospital.org"
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <div className="er" role="alert">
                {fieldErrors.email}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
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
              isEditing ? 'Save changes' : 'Add doctor'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export const DoctorModal: React.FC<DoctorModalProps> = ({
  isOpen,
  doctor,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal_title"
      onClick={onClose}
    >
      <DoctorForm
        key={doctor?.id || doctor?._id || 'new'}
        doctor={doctor}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};
