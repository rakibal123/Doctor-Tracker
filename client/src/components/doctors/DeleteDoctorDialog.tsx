'use client';

import React, { useState, useEffect } from 'react';
import { Doctor } from '../../types/doctor';
import { api, ApiError } from '../../lib/api';
import { Icon } from '../layout/Icons';

interface DeleteDoctorDialogProps {
  isOpen: boolean;
  doctor: Doctor | null;
  onClose: () => void;
  onSuccess: (deletedId: string, message: string) => void;
}

interface DeleteDoctorContentProps {
  doctor: Doctor;
  onClose: () => void;
  onSuccess: (deletedId: string, message: string) => void;
}

const DeleteDoctorContent: React.FC<DeleteDoctorContentProps> = ({
  doctor,
  onClose,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onClose]);

  const patientCount = doctor.patientCount || 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    const doctorId = doctor.id || doctor._id;

    try {
      const res = await api.delete<{ message?: string }>(`/doctors/${doctorId}`);
      const successMsg = res.message || `Doctor ${doctor.name} was deleted successfully.`;
      onSuccess(doctorId, successMsg);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete doctor record. Please check your network connection.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dlg" onClick={(e) => e.stopPropagation()}>
      <div className="dh">
        <h2 id="del_modal_title">Delete doctor</h2>
        <button
          type="button"
          className="btn ib"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close dialog"
          style={{ border: 0 }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="db">
        {errorMessage && (
          <div className="alert" role="alert" style={{ marginBottom: 14 }}>
            <Icon name="alert" />
            <span>{errorMessage}</span>
          </div>
        )}

        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Are you sure you want to delete <b>{doctor.name}</b>?
        </p>

        <p className="mut sm" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          {patientCount > 0 ? (
            <>
              Their <b>{patientCount} assigned patient{patientCount > 1 ? 's' : ''}</b> will
              remain in the system as unassigned. Patient medical records are safely preserved.
            </>
          ) : (
            'This doctor has no assigned patients. Their record will be permanently removed.'
          )}
        </p>

        <p className="mut sm" style={{ margin: '8px 0 0', color: 'var(--er)' }}>
          This action cannot be undone.
        </p>
      </div>

      <div className="df">
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn d"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <span
                className="spin"
                aria-hidden="true"
                style={{ width: 16, height: 16, marginRight: 8 }}
              />
              <span>Deleting...</span>
            </>
          ) : (
            'Delete doctor'
          )}
        </button>
      </div>
    </div>
  );
};

export const DeleteDoctorDialog: React.FC<DeleteDoctorDialogProps> = ({
  isOpen,
  doctor,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !doctor) return null;

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby="del_modal_title"
      onClick={onClose}
    >
      <DeleteDoctorContent
        key={doctor.id || doctor._id}
        doctor={doctor}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};
