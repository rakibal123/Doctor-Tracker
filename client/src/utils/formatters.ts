/**
 * Client-side formatting helpers for Doctor Tracker UI
 */

/**
 * Derives up to 2 uppercase initials from a name (e.g. "Sarah Connor" -> "SC").
 */
export function getInitials(name?: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats a Date / ISO string to UK locale "12 Oct 2026" as in reference HTML.
 */
export function formatPatientDate(isoDate?: string | Date): string {
  if (!isoDate) return 'Date unavailable';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'Date unavailable';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
