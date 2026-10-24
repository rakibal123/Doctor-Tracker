'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { Icon } from '../../components/layout/Icons';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Patient, PatientListResponse } from '../../types/patient';
import { PatientCondition, CONDITION_LABELS } from '../../types/dashboard';
import { getInitials, formatPatientDate } from '../../utils/formatters';
import { Doctor, DoctorListResponse } from '../../types/doctor';
import { PatientModal } from '../../components/patients/PatientModal';
import { DeletePatientDialog } from '../../components/patients/DeletePatientDialog';

const CONDITION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All conditions' },
  { value: 'Stable', label: 'Stable' },
  { value: 'Observation', label: 'Under Observation' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Recovered', label: 'Recovered' },
];

export default function PatientsPage() {
  const { checkSession } = useAuth();

  // Data & loading states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<PatientCondition | ''>('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'name' | 'age'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 's' | 'x' } | null>(null);

  const showToast = useCallback((text: string, type: 's' | 'x' = 's') => {
    setToastMessage({ text, type });
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch available doctors once for the filter dropdown & modal
  useEffect(() => {
    let isMounted = true;
    api.get<DoctorListResponse>('/doctors?limit=100').then((res) => {
      if (isMounted && res.data?.doctors) {
        setDoctorsList(res.data.doctors);
      }
    }).catch((err) => {
      console.warn('Failed to load doctors list for filter dropdown:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh trigger for re-fetching after mutations
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const triggerRefetch = useCallback(() => {
    setIsLoading(true);
    setFetchTrigger((n) => n + 1);
  }, []);

  // Fetch paginated patients list
  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '8');

      if (debouncedSearch.trim()) {
        params.set('q', debouncedSearch.trim());
      }
      if (selectedCondition) {
        params.set('condition', selectedCondition);
      }
      if (selectedDoctor) {
        params.set('doctor', selectedDoctor);
      }
      if (selectedDateRange) {
        params.set('dateRange', selectedDateRange);
      }
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      try {
        const res = await api.get<PatientListResponse>(`/patients?${params.toString()}`);
        if (isMounted) {
          if (res.data) {
            setPatients(res.data.patients || []);
            if (res.data.pagination) {
              setPagination(res.data.pagination);
            }
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
            setErrorMessage('Failed to load patients list. Please check your network connection.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    debouncedSearch,
    selectedCondition,
    selectedDoctor,
    selectedDateRange,
    sortField,
    sortOrder,
    fetchTrigger,
    checkSession,
  ]);

  const handleOpenAdd = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (_savedPatient: Patient, message: string) => {
    showToast(message);
    triggerRefetch();
  };

  const handleDeleteSuccess = (deletedId: string, message: string) => {
    showToast(message);
    // If deleted patient was the only item on current page > 1, navigate back one page
    if (patients.length === 1 && currentPage > 1) {
      setCurrentPage((p) => p - 1);
    } else {
      triggerRefetch();
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCondition('');
    setSelectedDoctor('');
    setSelectedDateRange('');
    setSortField('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="ph">
        <div>
          <h1>Patients</h1>
          <p>All patient records across every doctor.</p>
        </div>
        <button
          type="button"
          className="btn p"
          onClick={handleOpenAdd}
        >
          <Icon name="plus" />
          <span>Add patient</span>
        </button>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="tb">
        {/* Search by patient name */}
        <div className="sr">
          <Icon name="search" />
          <input
            className="inp"
            type="search"
            placeholder="Search patient name"
            aria-label="Search patients"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Condition Filter */}
        <select
          className="inp"
          aria-label="Filter by condition"
          value={selectedCondition}
          onChange={(e) => {
            setSelectedCondition(e.target.value as PatientCondition | '');
            setCurrentPage(1);
          }}
        >
          {CONDITION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Doctor Filter (includes Unassigned option) */}
        <select
          className="inp"
          aria-label="Filter by doctor"
          value={selectedDoctor}
          onChange={(e) => {
            setSelectedDoctor(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All doctors</option>
          <option value="unassigned">Unassigned patients</option>
          {doctorsList.map((d) => (
            <option key={d.id || d._id} value={d.id || d._id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Date Added Filter */}
        <select
          className="inp"
          aria-label="Filter by date added"
          value={selectedDateRange}
          onChange={(e) => {
            setSelectedDateRange(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Any date added</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>

        {/* Sort Order Selector */}
        <select
          className="inp"
          aria-label="Sort patients"
          value={`${sortField}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-') as [
              'createdAt' | 'name' | 'age',
              'asc' | 'desc',
            ];
            setSortField(field);
            setSortOrder(order);
            setCurrentPage(1);
          }}
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="age-asc">Age (Youngest first)</option>
          <option value="age-desc">Age (Oldest first)</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="card wrap" aria-busy="true" aria-label="Loading patients">
          <div style={{ padding: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="skr">
                <div className="sk" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                  <div className="sk" style={{ width: '35%', height: 14 }} />
                  <div className="sk" style={{ width: '20%', height: 12 }} />
                </div>
                <div className="sk" style={{ width: 80, height: 24, borderRadius: 6 }} />
                <div className="sk" style={{ width: '25%', height: 14 }} />
                <div className="sk" style={{ width: 64, height: 32 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State with Retry Button */}
      {!isLoading && errorMessage && (
        <div className="card pad es e" role="alert">
          <div className="ic">
            <Icon name="alert" size={24} />
          </div>
          <h2>Unable to load patients</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="btn p"
            onClick={triggerRefetch}
            style={{ margin: '0 auto' }}
          >
            <Icon name="refresh" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State: No results */}
      {!isLoading && !errorMessage && patients.length === 0 && (
        <div className="card pad es">
          <div className="ic">
            <Icon name="pat" size={24} />
          </div>
          <h2>No patients found</h2>
          <p>
            {debouncedSearch || selectedCondition || selectedDoctor || selectedDateRange
              ? 'No patient records match your filter criteria.'
              : 'There are no patients registered in the system yet.'}
          </p>
          {debouncedSearch || selectedCondition || selectedDoctor || selectedDateRange ? (
            <button
              type="button"
              className="btn"
              onClick={handleClearFilters}
              style={{ margin: '0 auto' }}
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              className="btn p"
              onClick={handleOpenAdd}
              style={{ margin: '0 auto' }}
            >
              <Icon name="plus" />
              <span>Add patient</span>
            </button>
          )}
        </div>
      )}

      {/* Patients Data: Desktop Table + Mobile Cards */}
      {!isLoading && !errorMessage && patients.length > 0 && (
        <div className="card wrap">
          {/* Desktop Table View */}
          <table className="tbl">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Condition</th>
                <th>Doctor</th>
                <th>Added on</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const patientId = p.id || p._id;
                const doctorId = p.doctor ? p.doctor._id || p.doctor.id : null;

                return (
                  <tr key={patientId}>
                    {/* Patient Column */}
                    <td>
                      <div className="id">
                        <span className="av">{getInitials(p.name)}</span>
                        <div>
                          <b>{p.name}</b>
                          <span className="mut sm">{p.age} years</span>
                        </div>
                      </div>
                    </td>

                    {/* Condition Badge */}
                    <td>
                      <span className={`bd ${p.condition}`}>
                        {CONDITION_LABELS[p.condition] || p.condition}
                      </span>
                    </td>

                    {/* Assigned Doctor */}
                    <td>
                      {p.doctor && doctorId ? (
                        <Link
                          href={`/doctors/${doctorId}`}
                          style={{ color: 'var(--pr)', textDecoration: 'none', fontWeight: 550 }}
                        >
                          {p.doctor.name}
                        </Link>
                      ) : (
                        <span className="bd Unassigned">Unassigned</span>
                      )}
                    </td>

                    {/* Added Date */}
                    <td>{formatPatientDate(p.createdAt)}</td>

                    {/* Actions */}
                    <td>
                      <div className="acts">
                        <Link
                          href={`/patients/${patientId}`}
                          className="btn v sm"
                          aria-label={`View details for ${p.name}`}
                          title={`View details for ${p.name}`}
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="btn ib"
                          onClick={() => handleOpenEdit(p)}
                          aria-label={`Edit ${p.name}`}
                          title={`Edit ${p.name}`}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="btn ib"
                          style={{ color: 'var(--er)' }}
                          onClick={() => setDeletingPatient(p)}
                          aria-label={`Delete ${p.name}`}
                          title={`Delete ${p.name}`}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Cards View */}
          <div className="pcs">
            {patients.map((p) => {
              const patientId = p.id || p._id;
              const doctorId = p.doctor ? p.doctor._id || p.doctor.id : null;

              return (
                <article className="pc" key={patientId}>
                  <div className="pc-top">
                    <div className="pc-info">
                      <h3 className="pc-title">{p.name}</h3>
                      <div className="pc-meta">
                        <span className="pc-id-badge" title={`Patient ID: ${patientId}`}>
                          ID: #{patientId.slice(-6).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span>{p.age} years old</span>
                      </div>
                    </div>
                    <span className={`bd ${p.condition}`}>
                      {CONDITION_LABELS[p.condition] || p.condition}
                    </span>
                  </div>

                  <div className="pc-grid">
                    <div className="pc-item">
                      <span className="pc-label">Assigned Doctor</span>
                      <span className="pc-val">
                        {p.doctor && doctorId ? (
                          <Link href={`/doctors/${doctorId}`}>
                            {p.doctor.name}
                          </Link>
                        ) : (
                          <span className="mut">Unassigned</span>
                        )}
                      </span>
                    </div>

                    <div className="pc-item">
                      <span className="pc-label">Hospital</span>
                      <span className="pc-val">
                        {p.doctor?.hospital || <span className="mut">Not specified</span>}
                      </span>
                    </div>

                    <div className="pc-item">
                      <span className="pc-label">Admitted</span>
                      <span className="pc-val">{formatPatientDate(p.createdAt)}</span>
                    </div>

                    <div className="pc-item">
                      <span className="pc-label">Specialization</span>
                      <span className="pc-val">
                        {p.doctor?.specialization || <span className="mut">General care</span>}
                      </span>
                    </div>
                  </div>

                  <div className="pc-actions">
                    <Link
                      href={`/patients/${patientId}`}
                      className="btn v"
                      aria-label={`View details for ${p.name}`}
                    >
                      View Details
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleOpenEdit(p)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Icon name="edit" size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ color: 'var(--er)' }}
                      onClick={() => setDeletingPatient(p)}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Icon name="trash" size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Toolbar */}
          <div className="pager">
            <span className="mut sm">
              Showing <b>{patients.length}</b> of <b>{pagination.total}</b> patients (Page {pagination.page} of {pagination.totalPages})
            </span>

            <div className="pgs">
              <button
                type="button"
                className="pg"
                disabled={!pagination.hasPrevPage}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <Icon name="back" size={16} />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`pg ${num === pagination.page ? 'on' : ''}`}
                  onClick={() => setCurrentPage(num)}
                  aria-label={`Go to page ${num}`}
                  aria-current={num === pagination.page ? 'page' : undefined}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                className="pg next"
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                aria-label="Next page"
              >
                <Icon name="back" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Patient Modal */}
      <PatientModal
        isOpen={isModalOpen}
        patient={editingPatient}
        doctorsList={doctorsList}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Permanent Delete Patient Confirmation Dialog */}
      <DeletePatientDialog
        isOpen={!!deletingPatient}
        patient={deletingPatient}
        onClose={() => setDeletingPatient(null)}
        onSuccess={handleDeleteSuccess}
      />

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
