'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { Icon } from '../../../components/layout/Icons';
import { api, ApiError } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Doctor, DoctorDetail, DoctorPatient, DoctorDetailResponse } from '../../../types/doctor';
import { CONDITION_LABELS } from '../../../types/dashboard';
import { getInitials, formatPatientDate } from '../../../utils/formatters';
import { DoctorModal } from '../../../components/doctors/DoctorModal';
import { DeleteDoctorDialog } from '../../../components/doctors/DeleteDoctorDialog';

function DoctorDetailContent() {
  const params = useParams();
  const doctorId = (params?.id as string) || '';
  const router = useRouter();
  const { checkSession } = useAuth();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit and Delete modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Unassign patient confirmation state
  const [unassigningPatient, setUnassigningPatient] = useState<DoctorPatient | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

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

    const loadDoctorDetail = async () => {
      if (!doctorId) return;

      try {
        const res = await api.get<DoctorDetailResponse>(`/doctors/${doctorId}`);
        if (isMounted) {
          if (res.data?.doctor) {
            setDoctor(res.data.doctor);
          } else {
            setErrorMessage('Doctor record could not be loaded.');
          }
          setErrorMessage(null);
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
            setErrorMessage('Failed to load doctor profile. Please check your network connection.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDoctorDetail();

    return () => {
      isMounted = false;
    };
  }, [doctorId, fetchTrigger, checkSession]);

  // Handle unassigning a patient safely via PATCH /api/v1/patients/:id { doctor: null }
  const handleConfirmUnassign = async () => {
    if (!unassigningPatient) return;
    setIsUnassigning(true);

    const patientId = unassigningPatient._id;
    try {
      await api.patch(`/patients/${patientId}`, { doctor: null });
      showToast(`${unassigningPatient.name} was removed from this doctor's list and set to unassigned.`);
      setUnassigningPatient(null);
      triggerRefetch(); // Refresh list and counts
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, 'x');
      } else {
        showToast('Failed to unassign patient.', 'x');
      }
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleEditSuccess = (savedDoctor: Doctor, message: string) => {
    showToast(message);
    setDoctor((prev) => (prev ? { ...prev, ...savedDoctor } : null));
    triggerRefetch();
  };

  const handleDeleteSuccess = (_deletedId: string, message: string) => {
    showToast(message);
    router.replace('/doctors');
  };

  return (
    <AppShell>
      {/* Back to Doctors list link */}
      <Link href="/doctors" className="back">
        <Icon name="back" size={16} />
        <span>Doctors</span>
      </Link>

      {/* Loading Skeleton */}
      {isLoading && (
        <div aria-busy="true" aria-label="Loading doctor details">
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
          <h2>Doctor not found</h2>
          <p>{errorMessage}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button type="button" className="btn p" onClick={triggerRefetch}>
              <Icon name="refresh" />
              <span>Retry</span>
            </button>
            <Link href="/doctors" className="btn">
              Back to doctors
            </Link>
          </div>
        </div>
      )}

      {/* Loaded Doctor Profile View */}
      {!isLoading && !errorMessage && doctor && (
        <>
          {/* Header with Doctor ID info and Action Buttons */}
          <div className="ph">
            <div className="id">
              <span className="av" style={{ width: 52, height: 52, fontSize: 16 }}>
                {getInitials(doctor.name)}
              </span>
              <div>
                <h1>{doctor.name}</h1>
                <p>
                  {doctor.specialization} · {doctor.hospital}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Icon name="edit" />
                <span>Edit doctor</span>
              </button>
              <button
                type="button"
                className="btn"
                style={{ color: 'var(--er)' }}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Icon name="trash" />
                <span>Delete doctor</span>
              </button>
            </div>
          </div>

          {/* Doctor Metadata Card */}
          <div className="card pad" style={{ marginBottom: 14 }}>
            <dl className="dl">
              <div>
                <dt>Specialization</dt>
                <dd>{doctor.specialization}</dd>
              </div>
              <div>
                <dt>Hospital</dt>
                <dd>{doctor.hospital}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{doctor.phone}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{doctor.email}</dd>
              </div>
            </dl>
          </div>

          {/* Assigned Patients Section */}
          <div className="card wrap">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)' }}>
              <h2>Assigned Patients ({doctor.patients?.length || 0})</h2>
            </div>

            {doctor.patients && doctor.patients.length > 0 ? (
              <>
                {/* Desktop Patients Table */}
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Condition</th>
                      <th>Added on</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctor.patients.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div className="id">
                            <span className="av">{getInitials(p.name)}</span>
                            <div>
                              <b>{p.name}</b>
                              <span className="mut sm">{p.age} years old</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`bd ${p.condition}`}>
                            {CONDITION_LABELS[p.condition] || p.condition}
                          </span>
                        </td>
                        <td>{formatPatientDate(p.createdAt)}</td>
                        <td>
                          <div className="acts">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setUnassigningPatient(p)}
                              aria-label={`Remove ${p.name} from this doctor`}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Patients Cards */}
                <div className="cards">
                  {doctor.patients.map((p) => (
                    <div className="cd" key={p._id}>
                      <div className="id" style={{ justifyContent: 'space-between' }}>
                        <div className="id">
                          <span className="av">{getInitials(p.name)}</span>
                          <div>
                            <b>{p.name}</b>
                            <span className="mut sm">{p.age} years old</span>
                            <span className="mut sm" style={{ display: 'block' }}>
                              Added on: {formatPatientDate(p.createdAt)}
                            </span>
                          </div>
                        </div>
                        <span className={`bd ${p.condition}`}>
                          {CONDITION_LABELS[p.condition] || p.condition}
                        </span>
                      </div>
                      <div className="acts" style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setUnassigningPatient(p)}
                        >
                          Remove from list
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="es">
                <div className="ic">
                  <Icon name="pat" size={24} />
                </div>
                <h2>No patients assigned</h2>
                <p>This doctor currently has no assigned patients. Patients can be assigned to {doctor.name} from the Patients section.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Doctor Modal */}
      {doctor && (
        <DoctorModal
          isOpen={isEditModalOpen}
          doctor={doctor}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Doctor Dialog */}
      {doctor && (
        <DeleteDoctorDialog
          isOpen={isDeleteDialogOpen}
          doctor={doctor}
          onClose={() => setIsDeleteDialogOpen(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Unassign Patient Confirmation Dialog */}
      {unassigningPatient && (
        <div
          className="ov"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unassign_modal_title"
          onClick={() => !isUnassigning && setUnassigningPatient(null)}
        >
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dh">
              <h2 id="unassign_modal_title">Remove patient from list</h2>
              <button
                type="button"
                className="btn ib"
                onClick={() => setUnassigningPatient(null)}
                disabled={isUnassigning}
                aria-label="Close dialog"
                style={{ border: 0 }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="db">
              <p style={{ margin: 0 }}>
                Remove <b>{unassigningPatient.name}</b> from <b>{doctor?.name}</b>’s list?
              </p>
              <p className="mut sm" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                The patient record stays in Patients and becomes unassigned. The patient’s clinical record will not be deleted.
              </p>
            </div>

            <div className="df">
              <button
                type="button"
                className="btn"
                onClick={() => setUnassigningPatient(null)}
                disabled={isUnassigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn d"
                onClick={handleConfirmUnassign}
                disabled={isUnassigning}
              >
                {isUnassigning ? (
                  <>
                    <span
                      className="spin"
                      aria-hidden="true"
                      style={{ width: 16, height: 16, marginRight: 8 }}
                    />
                    <span>Removing...</span>
                  </>
                ) : (
                  'Remove patient'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
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

export default function DoctorDetailPage() {
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
      <DoctorDetailContent />
    </Suspense>
  );
}
