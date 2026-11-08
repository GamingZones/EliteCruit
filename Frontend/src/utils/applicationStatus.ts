/**
 * Application Status Taxonomy & Helpers
 * Standardized single source of truth for application process tags, badges, and labels across all EliteCruit pages.
 */

export type CanonicalApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "approved"
  | "recruited"
  | "declined"
  | "withdrawn";

/**
 * Standardized human-readable status labels.
 * Unifies all legacy aliases:
 * - "denied", "rejected" -> "Declined"
 * - "accepted" -> "Approved" (or "Recruited" if status is recruited)
 * - "reviewed" -> "Under Review"
 * - "pending" -> "Submitted"
 */
export function formatApplicationStatusLabel(status: string | null | undefined): string {
  if (!status) return "Submitted";
  const s = String(status).trim().toLowerCase();

  switch (s) {
    case "recruited":
    case "hired":
    case "accepted":
      return "Recruited";
    case "approved":
      return "Approved";
    case "interviewing":
    case "interview":
      return "Interviewing";
    case "shortlisted":
      return "Shortlisted";
    case "under_review":
    case "reviewed":
      return "Under Review";
    case "withdrawn":
      return "Withdrawn";
    case "declined":
    case "denied":
    case "rejected":
      return "Declined";
    case "submitted":
    case "pending":
    default:
      return "Submitted";
  }
}

/**
 * Returns consistent CSS class names for status badges and chips.
 * Includes both "chip-declined" and legacy "chip-denied" / "status-denied" for full styling compatibility.
 */
export function getApplicationStatusBadgeClass(status: string | null | undefined): string {
  if (!status) return "status-badge-chip chip-pending status-chip pending";
  const s = String(status).trim().toLowerCase();

  switch (s) {
    case "recruited":
    case "hired":
    case "accepted":
      return "status-badge-chip chip-recruited status-chip recruited approved";
    case "approved":
      return "status-badge-chip chip-approved status-chip approved";
    case "interviewing":
    case "interview":
      return "status-badge-chip chip-interviewing status-chip interviewing";
    case "shortlisted":
      return "status-badge-chip chip-shortlisted status-chip shortlisted";
    case "under_review":
    case "reviewed":
      return "status-badge-chip chip-under-review status-chip under-review";
    case "withdrawn":
      return "status-badge-chip chip-withdrawn status-chip withdrawn";
    case "declined":
    case "denied":
    case "rejected":
      return "status-badge-chip chip-declined chip-denied status-chip declined denied";
    case "submitted":
    case "pending":
    default:
      return "status-badge-chip chip-pending status-chip pending";
  }
}

export function isApprovedStatus(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toLowerCase();
  return s === "approved" || s === "accepted" || s === "recruited" || s === "hired";
}

export function isDeniedStatus(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toLowerCase();
  return s === "declined" || s === "denied" || s === "rejected";
}

export function isFinalizedStatus(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toLowerCase();
  return isApprovedStatus(s) || isDeniedStatus(s) || s === "withdrawn";
}
