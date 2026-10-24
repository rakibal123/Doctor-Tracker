'use client';

import React, { useState, useEffect } from 'react';
import { Patient } from '../../types/patient';
import { api, ApiError } from '../../lib/api';
import { Icon } from '../layout/Icons';

interface DeletePatientDialogProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSuccess: (deletedId: string, message: string) => void;
}

interface DeletePatientContentProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: (deletedId: string, message: string) => void;
}

const DeletePatientContent: React.FC<DeletePatientContentProps> = ({
  patient,
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

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    const patientId = patient.id || patient._id;

    try {
      const res = await api.delete<{ message?: string }>(`/patients/${patientId}`);
      const successMsg = res.message || `Patient ${patient.name} was permanently deleted.`;
      onSuccess(patientId, successMsg);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to delete patient record. Please check your network connection.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const doctorName = patient.doctor?.name || null;

  return (
    <div className="dlg" onClick={(e) => e.stopPropagation()}>
      <div className="dh">
        <h2 id="del_pat_title">Delete patient</h2>
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
          You’re about to permanently delete <b>{patient.name}</b> ({patient.age} years old).
        </p>

        <p className="mut sm" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          {doctorName ? (
            <>
              Their medical record will be completely removed from the system and from{' '}
              <b>{doctorName}</b>’s list. This is permanent and differs from unassigning.
            </>
          ) : (
            'Their record will be completely removed from the system. This action cannot be undone.'
          )}
        </p>

        <p className="mut sm" style={{ margin: '8px 0 0', color: 'var(--er)' }}>
          This cannot be undone.
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
            'Delete patient'
          )}
        </button>
      </div>
    </div>
  );
};

export const DeletePatientDialog: React.FC<DeletePatientDialogProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !patient) return null;

  return (
    <div
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby="del_pat_title"
      onClick={onClose}
    >
      <DeletePatientContent
        key={patient.id || patient._id}
        patient={patient}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};
