'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { Icon } from '../../../components/layout/Icons';
import { api, ApiError } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Patient, PatientDetailResponse } from '../../../types/patient';
import { CONDITION_LABELS } from '../../../types/dashboard';
import { getInitials, formatPatientDate } from '../../../utils/formatters';
import { PatientModal } from '../../../components/patients/PatientModal';
import { DeletePatientDialog } from '../../../components/patients/DeletePatientDialog';

function PatientDetailContent() {
  const params = useParams();
  const patientId = (params?.id as string) || '';
  const router = useRouter();
  const { checkSession } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 's' | 'x' } | null>(null);

  const showToast = useCallback((text: string, type: 's' | 'x' = 's') => {
    setToastMessage({ text, type });
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const [fetchTrigger, setFetchTrigger] = useState(0);
  const triggerRefetch = useCallback(() => {
    setIsLoading(true);
    setFetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPatientDetail = async () => {
      if (!patientId) return;

      try {
        const res = await api.get<PatientDetailResponse>(`/patients/${patientId}`);
        if (isMounted) {
          if (res.data?.patient) {
            setPatient(res.data.patient);
            setErrorMessage(null);
          } else {
            setErrorMessage('Patient record could not be loaded.');
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            if (err.status === 401) {
              await checkSession();
              return;
            }
            setErrorMessage(err.message);
          } else {
            setErrorMessage('Failed to load patient record. Please check your network connection.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPatientDetail();

    return () => {
      isMounted = false;
    };
  }, [patientId, fetchTrigger, checkSession]);

  const handleEditSuccess = (savedPatient: Patient, message: string) => {
    showToast(message);
    setPatient((prev) => (prev ? { ...prev, ...savedPatient } : null));
    triggerRefetch();
  };

  const handleDeleteSuccess = (_deletedId: string, message: string) => {
    showToast(message);
    router.replace('/patients');
  };

  const doctor = patient?.doctor;
  const doctorId = doctor ? doctor._id || doctor.id : null;

  return (
    <AppShell>
      {/* Back to Patients navigation */}
      <Link href="/patients" className="back">
        <Icon name="back" size={16} />
        <span>Patients</span>
      </Link>

      {/* Loading Skeleton */}
      {isLoading && (
        <div aria-busy="true" aria-label="Loading patient details">
          <div className="card pad" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <div className="sk" style={{ width: 52, height: 52, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <div className="sk" style={{ width: '40%', height: 20 }} />
                <div className="sk" style={{ width: '25%', height: 14 }} />
              </div>
            </div>
            <div className="dl">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="sk" style={{ width: '30%', height: 12, marginBottom: 6 }} />
                  <div className="sk" style={{ width: '60%', height: 16 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <div className="card pad es e" role="alert">
          <div className="ic">
            <Icon name="alert" size={24} />
          </div>
          <h2>Patient record not found</h2>
          <p>{errorMessage}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn"
              onClick={() => router.push('/patients')}
            >
              Back to Patients
            </button>
            <button
              type="button"
              className="btn p"
              onClick={triggerRefetch}
            >
              <Icon name="refresh" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Loaded Patient Profile View */}
      {!isLoading && !errorMessage && patient && (
        <>
          {/* Header Card */}
          <div className="ph" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="av" style={{ width: 48, height: 48, fontSize: 16 }}>
                {getInitials(patient.name)}
              </span>
              <div>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span>{patient.name}</span>
                  <span className={`bd ${patient.condition}`}>
                    {CONDITION_LABELS[patient.condition] || patient.condition}
                  </span>
                </h1>
                <p className="mut sm">
                  Patient ID: <span style={{ fontFamily: 'monospace' }}>{patient._id || patient.id}</span>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Icon name="edit" />
                <span>Edit patient</span>
              </button>
              <button
                type="button"
                className="btn"
                style={{ color: 'var(--er)' }}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Icon name="trash" />
                <span>Delete record</span>
              </button>
            </div>
          </div>

          {/* Clinical Information Card */}
          <div className="card pad" style={{ marginBottom: 14 }}>
            <h2 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Clinical Details</h2>
            <dl className="dl">
              <div>
                <dt>Age</dt>
                <dd>{patient.age} years old</dd>
              </div>
              <div>
                <dt>Clinical Condition</dt>
                <dd>
                  <span className={`bd ${patient.condition}`} style={{ marginTop: 2 }}>
                    {CONDITION_LABELS[patient.condition] || patient.condition}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Date Admitted</dt>
                <dd>{formatPatientDate(patient.createdAt)}</dd>
              </div>
              <div>
                <dt>Last Updated</dt>
                <dd>{formatPatientDate(patient.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Assigned Doctor Card */}
          <div className="card pad" style={{ marginBottom: 14 }}>
            <h2 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Assigned Doctor</h2>
            {doctor && doctorId ? (
              <dl className="dl">
                <div>
                  <dt>Doctor Name</dt>
                  <dd>
                    <Link
                      href={`/doctors/${doctorId}`}
                      style={{ color: 'var(--pr)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {doctor.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Specialization</dt>
                  <dd>{doctor.specialization || 'Not specified'}</dd>
                </div>
                <div>
                  <dt>Hospital / Facility</dt>
                  <dd>{doctor.hospital || 'Not specified'}</dd>
                </div>
                <div>
                  <dt>Doctor Contact</dt>
                  <dd>
                    {doctor.email || doctor.phone ? (
                      <span>
                        {doctor.email} {doctor.phone && `· ${doctor.phone}`}
                      </span>
                    ) : (
                      <span className="mut">Not provided</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <span className="bd Unassigned">Unassigned</span>
                <span className="mut sm">
                  This patient is currently not assigned to any attending doctor.
                </span>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setIsEditModalOpen(true)}
                  style={{ marginLeft: 'auto' }}
                >
                  Assign Doctor
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Patient Modal */}
      {patient && (
        <PatientModal
          isOpen={isEditModalOpen}
          patient={patient}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Patient Confirmation Dialog */}
      {patient && (
        <DeletePatientDialog
          isOpen={isDeleteDialogOpen}
          patient={patient}
          onClose={() => setIsDeleteDialogOpen(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Toast notifications */}
      {toastMessage && (
        <div id="toasts" aria-live="polite">
          <div className={`ts ${toastMessage.type}`}>
            <Icon name={toastMessage.type === 's' ? 'check' : 'alert'} size={16} />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="card pad" style={{ minHeight: 180 }}>
            <div className="sk" style={{ height: 24, width: '40%', marginBottom: 12 }} />
            <div className="sk" style={{ height: 14, width: '60%' }} />
          </div>
        </AppShell>
      }
    >
      <PatientDetailContent />
    </Suspense>
  );
}
