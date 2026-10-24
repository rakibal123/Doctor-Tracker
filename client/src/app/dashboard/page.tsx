'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { api, ApiError } from '../../lib/api';
import { Icon } from '../../components/layout/Icons';
import {
  DashboardData,
  CONDITION_LABELS,
  CONDITION_COLORS,
} from '../../types/dashboard';
import { getInitials, formatPatientDate } from '../../utils/formatters';

export default function DashboardPage() {
  const { user, checkSession } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.get<DashboardData>('/dashboard/stats');
      if (res.data) {
        setData(res.data);
      } else {
        setErrorMessage('Invalid statistics response format received from server.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Session expired on backend: trigger session refresh
          await checkSession();
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while loading dashboard statistics.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkSession]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialStats = async () => {
      try {
        const res = await api.get<DashboardData>('/dashboard/stats');
        if (isMounted) {
          if (res.data) {
            setData(res.data);
          } else {
            setErrorMessage('Invalid statistics response format received from server.');
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
            setErrorMessage('An unexpected error occurred while loading dashboard statistics.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialStats();

    return () => {
      isMounted = false;
    };
  }, [checkSession]);

  // Derived values for chart heights & widths
  const monthlyAdmissions = data?.monthlyAdmissions || [];
  const maxMonthly = monthlyAdmissions.length > 0
    ? Math.max(...monthlyAdmissions.map((m) => m.count), 1)
    : 1;

  const caseloadDoctors = data?.caseloadByDoctor || [];
  const maxCaseload = caseloadDoctors.length > 0
    ? Math.max(...caseloadDoctors.map((d) => d.patientCount), 1)
    : 1;

  const recentPatients = data?.recentPatients || [];
  const conditionBreakdown = data?.conditionBreakdown || [];
  const summary = data?.summary;
  const isEntirelyEmpty = summary && summary.totalDoctors === 0 && summary.totalPatients === 0;

  return (
    <AppShell>
      {/* Header section with page title & greeting */}
      <div className="ph">
        <div>
          <h1>Dashboard</h1>
          <p>
            Good morning, {user?.name || 'Admin'}. Here’s how your network looks today.
          </p>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div aria-busy="true" aria-label="Loading dashboard analytics">
          {/* Skeleton 4 KPI cards */}
          <div className="g4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card pad stat" style={{ minHeight: 110 }}>
                <div className="sk" style={{ width: '45%', marginBottom: 12 }} />
                <div className="sk" style={{ width: '30%', height: 28, marginBottom: 10 }} />
                <div className="sk" style={{ width: '60%' }} />
              </div>
            ))}
          </div>

          {/* Skeleton 2 charts grid */}
          <div className="g2">
            <div className="card pad" style={{ minHeight: 250 }}>
              <div className="sk" style={{ width: '50%', marginBottom: 8 }} />
              <div className="sk" style={{ width: '25%', marginBottom: 24 }} />
              <div className="sk" style={{ height: 140 }} />
            </div>
            <div className="card pad" style={{ minHeight: 250 }}>
              <div className="sk" style={{ width: '40%', marginBottom: 8 }} />
              <div className="sk" style={{ width: '30%', marginBottom: 24 }} />
              <div style={{ display: 'grid', gap: 14 }}>
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="sk" style={{ height: 16 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton bottom 2 cards */}
          <div className="g2b">
            <div className="card pad" style={{ minHeight: 200 }}>
              <div className="sk" style={{ width: '40%', marginBottom: 16 }} />
              <div style={{ display: 'grid', gap: 12 }}>
                {[1, 2, 3].map((k) => (
                  <div key={k} className="sk" style={{ height: 36 }} />
                ))}
              </div>
            </div>
            <div className="card pad" style={{ minHeight: 200 }}>
              <div className="sk" style={{ width: '30%', marginBottom: 16 }} />
              <div style={{ display: 'grid', gap: 14 }}>
                {[1, 2, 3, 4].map((l) => (
                  <div key={l} className="sk" style={{ height: 16 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State with Retry Button */}
      {!isLoading && errorMessage && (
        <div className="card pad es e" role="alert">
          <div className="ic">
            <Icon name="alert" size={24} />
          </div>
          <h2>Unable to load dashboard data</h2>
          <p>{errorMessage}</p>
          <button
            type="button"
            className="btn p"
            onClick={fetchStats}
            style={{ margin: '0 auto' }}
          >
            <Icon name="refresh" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Analytics Dashboard Content */}
      {!isLoading && !errorMessage && data && summary && (
        <>
          {/* Zero records notification if database collections are empty */}
          {isEntirelyEmpty && (
            <div
              className="card pad"
              style={{
                marginBottom: 16,
                backgroundColor: 'var(--sub)',
                borderLeft: '4px solid var(--pr)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name="shield" size={20} />
                <div>
                  <b>No records in database yet</b>
                  <p className="mut sm" style={{ margin: '2px 0 0' }}>
                    Your system is ready. Seed records or add doctors and patients to visualize live clinical metrics.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top 4 KPI Stat Cards */}
          <div className="g4">
            {/* 1. Total Doctors */}
            <div className="card pad stat">
              <div className="mut">Total doctors</div>
              <div className="v">{summary.totalDoctors}</div>
              <div className="mut sm">{summary.totalHospitals} hospitals</div>
            </div>

            {/* 2. Total Patients */}
            <div className="card pad stat">
              <div className="mut">Total patients</div>
              <div className="v">{summary.totalPatients}</div>
              <div className="mut sm">
                {summary.criticalPatients} in critical condition
                {summary.unassignedPatients > 0 && ` · ${summary.unassignedPatients} unassigned`}
              </div>
            </div>

            {/* 3. Patients per Doctor */}
            <div className="card pad stat">
              <div className="mut">Patients per doctor</div>
              <div className="v">{summary.patientsPerDoctor.toFixed(1)}</div>
              <div className="mut sm">
                {summary.idleDoctors > 0
                  ? `${summary.idleDoctors} without patients`
                  : 'Every doctor has patients'}
              </div>
            </div>

            {/* 4. Added in 30 Days */}
            <div className="card pad stat">
              <div className="mut">Added in 30 days</div>
              <div className="v">{summary.addedLast30Days}</div>
              <div className="mut sm">{summary.addedLast7Days} in the last 7 days</div>
            </div>
          </div>

          {/* Middle Row: Monthly Admissions Chart + Patients by Doctor */}
          <div className="g2">
            {/* Bar Chart: Patients added per month (Last 6 Months) */}
            <div className="card pad">
              <h2>Patients added per month</h2>
              <div className="mut sm">Last 6 months</div>

              <div
                className="cols"
                role="img"
                aria-label={`Patients added per month chart showing total ${summary.totalPatients} patients across last 6 months`}
              >
                {monthlyAdmissions.map((m) => {
                  const heightPercent = maxMonthly > 0 ? (m.count / maxMonthly) * 80 : 0;
                  return (
                    <div key={`${m.year}-${m.month}`} title={`${m.month} ${m.year}: ${m.count} patients`}>
                      <span>{m.count}</span>
                      <i style={{ height: `${heightPercent}%` }} />
                    </div>
                  );
                })}
              </div>

              <div className="mon">
                {monthlyAdmissions.map((m) => (
                  <span key={`${m.year}-${m.month}`}>{m.month}</span>
                ))}
              </div>
            </div>

            {/* Caseload: Patients by Doctor (Top 6) */}
            <div className="card pad">
              <h2>Patients by doctor</h2>
              <div className="mut sm">Top 6 by patient count</div>

              {caseloadDoctors.length > 0 ? (
                <div className="bars">
                  {caseloadDoctors.map((doc) => {
                    const widthPercent = maxCaseload > 0 ? (doc.patientCount / maxCaseload) * 100 : 0;
                    return (
                      <div className="bar" key={doc.id}>
                        <span className="n" title={`${doc.name} (${doc.specialization})`}>
                          {doc.name}
                        </span>
                        <div className="trk">
                          <i style={{ width: `${widthPercent}%` }} />
                        </div>
                        <b>{doc.patientCount}</b>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mut sm" style={{ margin: '14px 0 0' }}>
                  No doctor caseload data available.
                </p>
              )}
            </div>
          </div>

          {/* Bottom Row: Recent Patients Feed + Condition Breakdown */}
          <div className="g2b">
            {/* Recent Patients */}
            <div className="card pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Recent patients</h2>
                <Link href="/patients" style={{ color: 'var(--pr)', textDecoration: 'none', fontWeight: 550 }}>
                  View all
                </Link>
              </div>

              {recentPatients.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {recentPatients.map((p) => (
                    <div className="li" key={p.id}>
                      <span className="av">{getInitials(p.name)}</span>
                      <div className="gr">
                        <b>{p.name}</b>
                        <span className="mut sm">
                          {p.doctor ? p.doctor.name : 'Unassigned'} · Added on {formatPatientDate(p.createdAt)}
                        </span>
                      </div>
                      <span className={`bd ${p.condition}`}>
                        {CONDITION_LABELS[p.condition] || p.condition}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mut sm" style={{ margin: '14px 0 0' }}>
                  No recent patients found in the system.
                </p>
              )}
            </div>

            {/* Clinical Conditions Distribution */}
            <div className="card pad">
              <h2>Conditions</h2>
              <div className="mut sm">Clinical distribution across registered patients</div>

              {conditionBreakdown.length > 0 ? (
                <div className="bars">
                  {conditionBreakdown.map((cb) => (
                    <div className="bar" key={cb.condition} title={`${cb.count} patients (${cb.percentage}%)`}>
                      <span className="n">{CONDITION_LABELS[cb.condition] || cb.condition}</span>
                      <div className="trk">
                        <i
                          style={{
                            width: `${cb.percentage}%`,
                            background: CONDITION_COLORS[cb.condition] || 'var(--pr)',
                          }}
                        />
                      </div>
                      <b>{cb.count}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mut sm" style={{ margin: '14px 0 0' }}>
                  No clinical conditions recorded.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
