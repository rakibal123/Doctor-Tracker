'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { Icon } from '../../components/layout/Icons';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Doctor, DoctorListResponse } from '../../types/doctor';
import { getInitials } from '../../utils/formatters';
import { DoctorModal } from '../../components/doctors/DoctorModal';
import { DeleteDoctorDialog } from '../../components/doctors/DeleteDoctorDialog';

export default function DoctorsPage() {
  const { checkSession } = useAuth();

  // Data & loading states
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);

  // Popover menu state for doctor row actions
  const [activeMenuDoctorId, setActiveMenuDoctorId] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 's' | 'x' } | null>(null);

  const showToast = useCallback((text: string, type: 's' | 'x' = 's') => {
    setToastMessage({ text, type });
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Refresh trigger for manual refetching after mutations
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const triggerRefetch = useCallback(() => {
    setIsLoading(true);
    setFetchTrigger((n) => n + 1);
  }, []);

  // Fetch doctors on filter changes or refetch trigger
  useEffect(() => {
    let isMounted = true;

    const loadDoctors = async () => {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '6');

      if (debouncedSearch.trim()) {
        params.set('q', debouncedSearch.trim());
      }
      if (selectedSpecialization) {
        params.set('specialization', selectedSpecialization);
      }
      if (selectedDateRange) {
        params.set('dateRange', selectedDateRange);
      }
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder);

      try {
        const res = await api.get<DoctorListResponse>(`/doctors?${params.toString()}`);
        if (isMounted) {
          if (res.data) {
            setDoctors(res.data.doctors || []);
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
            setErrorMessage('Failed to load doctors list. Please check your network connection.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDoctors();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    debouncedSearch,
    selectedSpecialization,
    selectedDateRange,
    sortField,
    sortOrder,
    fetchTrigger,
    checkSession,
  ]);

  // Dynamic set of specializations for filter dropdown
  const uniqueSpecializations = useMemo(() => {
    const specs = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialization) specs.add(d.specialization);
    });
    return Array.from(specs).sort();
  }, [doctors]);

  // Close active row menu on document click
  useEffect(() => {
    const closeMenu = () => setActiveMenuDoctorId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Copy email to clipboard with feedback
  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied to clipboard.');
    } catch {
      showToast('Failed to copy email.', 'x');
    }
  };

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (_savedDoctor: Doctor, message: string) => {
    showToast(message);
    triggerRefetch();
  };

  const handleDeleteSuccess = (_deletedId: string, message: string) => {
    showToast(message);
    if (doctors.length === 1 && currentPage > 1) {
      setCurrentPage((p) => p - 1);
    } else {
      triggerRefetch();
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedSpecialization('');
    setSelectedDateRange('');
    setSortField('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return (
    <AppShell>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Doctors</h1>
          <p>Manage doctor records and see how many patients each one has.</p>
        </div>
        <button
          type="button"
          className="btn p"
          onClick={handleOpenAdd}
        >
          <Icon name="plus" />
          <span>Add doctor</span>
        </button>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="tb">
        {/* Multi-field search */}
        <div className="sr">
          <Icon name="search" />
          <input
            className="inp"
            type="search"
            placeholder="Search name, hospital or email"
            aria-label="Search doctors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Specialization Filter */}
        <select
          className="inp"
          aria-label="Filter by specialization"
          value={selectedSpecialization}
          onChange={(e) => {
            setSelectedSpecialization(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All specializations</option>
          {uniqueSpecializations.map((spec) => (
            <option key={spec} value={spec}>
              {spec}
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
          <option value="365">Last 12 months</option>
        </select>

        {/* Sort Order Selector */}
        <select
          className="inp"
          aria-label="Sort doctors"
          value={`${sortField}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-') as ['createdAt' | 'name', 'asc' | 'desc'];
            setSortField(field);
            setSortOrder(order);
            setCurrentPage(1);
          }}
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="card wrap" aria-busy="true" aria-label="Loading doctors">
          <div style={{ padding: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skr">
                <div className="sk" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                  <div className="sk" style={{ width: '40%', height: 14 }} />
                  <div className="sk" style={{ width: '25%', height: 12 }} />
                </div>
                <div className="sk" style={{ width: '20%', height: 14 }} />
                <div className="sk" style={{ width: 60, height: 32 }} />
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
          <h2>Unable to load doctors</h2>
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

      {/* Empty State: No results found */}
      {!isLoading && !errorMessage && doctors.length === 0 && (
        <div className="card pad es">
          <div className="ic">
            <Icon name="doc" size={24} />
          </div>
          <h2>No doctors found</h2>
          <p>
            {debouncedSearch || selectedSpecialization || selectedDateRange
              ? 'No doctor records match your filter criteria.'
              : 'There are no doctors registered in the system yet.'}
          </p>
          {debouncedSearch || selectedSpecialization || selectedDateRange ? (
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
              <span>Add doctor</span>
            </button>
          )}
        </div>
      )}

      {/* Data View: Doctor Cards Grid */}
      {!isLoading && !errorMessage && doctors.length > 0 && (
        <>
          <div className="dg">
            {doctors.map((d) => {
              const docId = d.id || d._id;
              const isMenuOpen = activeMenuDoctorId === docId;

              return (
                <article className="dc" key={docId}>
                  <div className="dt">
                    <span className="av">{getInitials(d.name)}</span>
                    <div className="tc">
                      <b className="tr" title={d.name}>
                        {d.name}
                      </b>
                      <span className="tag" title={d.specialization}>
                        {d.specialization}
                      </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="btn ib"
                        aria-label={`More actions for ${d.name}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        style={{ border: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuDoctorId(isMenuOpen ? null : docId);
                        }}
                      >
                        <Icon name="dots" />
                      </button>

                      {/* Popover Actions Menu */}
                      {isMenuOpen && (
                        <div
                          className="pop"
                          role="menu"
                          style={{ right: 0, top: '100%', marginTop: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/doctors/${docId}`}
                            role="menuitem"
                            onClick={() => setActiveMenuDoctorId(null)}
                          >
                            <Icon name="eye" />
                            <span>View details</span>
                          </Link>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuDoctorId(null);
                              handleOpenEdit(d);
                            }}
                          >
                            <Icon name="edit" />
                            <span>Edit doctor</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setActiveMenuDoctorId(null);
                              handleCopyEmail(d.email);
                            }}
                          >
                            <Icon name="check" />
                            <span>Copy email</span>
                          </button>

                          <div className="sep" />

                          <button
                            type="button"
                            role="menuitem"
                            className="dng"
                            onClick={() => {
                              setActiveMenuDoctorId(null);
                              setDeletingDoctor(d);
                            }}
                          >
                            <Icon name="trash" />
                            <span>Delete doctor</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="inf">
                    <div title={d.hospital || 'Not provided'}>
                      <Icon name="bld" />
                      <span>{d.hospital || <span className="mut">Not provided</span>}</span>
                    </div>
                    <div title={d.email || 'Not provided'}>
                      <Icon name="mail" />
                      <span>{d.email || <span className="mut">Not provided</span>}</span>
                    </div>
                    <div>
                      <Icon name="tel" />
                      <span>{d.phone || <span className="mut">Not provided</span>}</span>
                    </div>
                  </div>

                  <div className="dv" />

                  <div className="acts">
                    <Link
                      href={`/doctors/${docId}`}
                      className="btn v"
                      aria-label={`View details for ${d.name}`}
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleOpenEdit(d)}
                      aria-label={`Edit ${d.name}`}
                    >
                      Edit doctor
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Toolbar */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="pager">
              <span className="mut sm">
                Showing <b>{doctors.length}</b> of <b>{pagination.total}</b> doctors (Page {pagination.page} of {pagination.totalPages})
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
        </>
      )}

      {/* Add / Edit Doctor Modal */}
      <DoctorModal
        isOpen={isModalOpen}
        doctor={editingDoctor}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Doctor Confirmation Dialog */}
      <DeleteDoctorDialog
        isOpen={!!deletingDoctor}
        doctor={deletingDoctor}
        onClose={() => setDeletingDoctor(null)}
        onSuccess={handleDeleteSuccess}
      />

      {/* Floating Toast Notification Container */}
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
