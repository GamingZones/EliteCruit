import React, { useEffect, useState, useMemo } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ConfirmationModal from "../../components/ConfirmationModal";
import "./Admin-EmployerManagement.css";
import { authFetch, getStoredUser } from "../../utils/auth";

interface EmployerItem {
  user_id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  business_name?: string;
  industry?: string;
  company_size?: string;
  company_description?: string;
  contact_number?: string;
  city?: string;
  company_address?: string;
  website?: string;
  company_logo_path?: string;
  total_jobs: number;
  total_applications_received: number;
  rating: string | null;
  total_reviews: number;
}

export default function AdminEmployerManagement() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [inspectingEmployer, setInspectingEmployer] = useState<EmployerItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      window.location.href = "/login";
      return;
    }
    setAdminUser(stored);

    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch("/api/admin/employers");
      if (res.ok) {
        const data = await res.json();
        setEmployers(data.employers || []);
      }
    } catch {
      showToast("Unable to load employers from server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // DOUBLE VERIFICATION MODAL STATES
  const [statusEmployerTarget, setStatusEmployerTarget] = useState<EmployerItem | null>(null);
  const [resetEmployerTarget, setResetEmployerTarget] = useState<EmployerItem | null>(null);

  const handleToggleStatus = (employer: EmployerItem) => {
    setStatusEmployerTarget(employer);
  };

  const doConfirmToggleStatus = async () => {
    if (!statusEmployerTarget) return;
    const employer = statusEmployerTarget;
    const nextStatus = !employer.is_active;
    setStatusEmployerTarget(null);

    try {
      setIsUpdating(true);
      const res = await authFetch(`/api/admin/users/${employer.user_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (res.ok) {
        setEmployers((prev) =>
          prev.map((e) =>
            e.user_id === employer.user_id ? { ...e, is_active: nextStatus } : e
          )
        );
        if (inspectingEmployer?.user_id === employer.user_id) {
          setInspectingEmployer({ ...inspectingEmployer, is_active: nextStatus });
        }
        showToast(`Employer account ${nextStatus ? "activated" : "suspended"} successfully.`, "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to update employer status.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = (employer: EmployerItem) => {
    setResetEmployerTarget(employer);
  };

  const doConfirmResetPassword = async () => {
    if (!resetEmployerTarget) return;
    const employer = resetEmployerTarget;
    setResetEmployerTarget(null);

    try {
      setIsUpdating(true);
      const res = await authFetch(`/api/admin/users/${employer.user_id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "EliteCruit2026!" }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Password for ${employer.email} has been reset to: ${data.temporaryPassword}`);
        showToast("Password reset successfully.", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to reset password.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Distinct cities for filter dropdown
  const cities = useMemo(() => {
    const set = new Set<string>();
    employers.forEach((e) => {
      if (e.city && e.city.trim()) set.add(e.city.trim());
    });
    return Array.from(set).sort();
  }, [employers]);

  // Filtered employers
  const filteredEmployers = useMemo(() => {
    return employers.filter((e) => {
      const bName = (e.business_name || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      const ind = (e.industry || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || bName.includes(q) || email.includes(q) || ind.includes(q);
      const matchesCity = selectedCity === "All" || (e.city && e.city.toLowerCase() === selectedCity.toLowerCase());
      const matchesStatus =
        selectedStatus === "All" ||
        (selectedStatus === "Active" && e.is_active) ||
        (selectedStatus === "Suspended" && !e.is_active);

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [employers, searchQuery, selectedCity, selectedStatus]);

  // Statistics
  const totalCount = employers.length;
  const activeCount = employers.filter((e) => e.is_active).length;
  const suspendedCount = employers.filter((e) => !e.is_active).length;
  const totalJobsPosted = useMemo(() => {
    return employers.reduce((acc, e) => acc + (e.total_jobs || 0), 0);
  }, [employers]);

  const avgRating = useMemo(() => {
    const withRatings = employers.filter((e) => e.rating !== null && Number(e.rating) > 0);
    if (withRatings.length === 0) return "N/A";
    const sum = withRatings.reduce((acc, e) => acc + Number(e.rating), 0);
    return (sum / withRatings.length).toFixed(1);
  }, [employers]);

  const adminName = adminUser?.displayName || adminUser?.display_name || "System Administrator";

  return (
    <div className="admin-layout admin-employer-mgmt">
      <AdminSidebar activePath="/admin-employers" adminName={adminName} />

      <main className="admin-main">
        {/* Top Header - Matches Applicant & Employer Topbar */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Employer Management</strong>
          </div>
          <div className="appdash-top-right">
            <a href="/admin-employer-analytics" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#103f65", textDecoration: "none", backgroundColor: "#e2e8f0", padding: "0.3rem 0.75rem", borderRadius: "0.375rem" }}>
              View Employer Analytics
            </a>
            <span className="admin-role-badge">ADMIN</span>
          </div>
        </header>

        {/* Content */}
        <section className="admin-content">
          {toastMessage && (
            <div className={`admin-toast-msg ${toastMessage.type}`}>
              {toastMessage.text}
            </div>
          )}

          {/* KPI Stats */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Employers</span>
              <strong className="admin-stat-value">{isLoading ? "..." : totalCount}</strong>
              <span className="admin-stat-desc">Registered companies</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Companies</span>
              <strong className="admin-stat-value" style={{ color: "#16a34a" }}>
                {isLoading ? "..." : activeCount}
              </strong>
              <span className="admin-stat-desc">Actively hiring</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Suspended Accounts</span>
              <strong className="admin-stat-value" style={{ color: "#dc2626" }}>
                {isLoading ? "..." : suspendedCount}
              </strong>
              <span className="admin-stat-desc">Access restricted</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Job Posts</span>
              <strong className="admin-stat-value" style={{ color: "#0284c7" }}>
                {isLoading ? "..." : totalJobsPosted}
              </strong>
              <span className="admin-stat-desc">Open positions created</span>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="admin-filter-bar">
            <div className="admin-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search business name, email, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="admin-filter-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="All">All Cavite Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Data Table */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <h3>Registered Hiring Organizations</h3>
              <span className="admin-table-count">
                Showing {filteredEmployers.length} of {totalCount} employers
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="col-company">Company</th>
                    <th className="col-industry">Industry</th>
                    <th className="col-location">City / Location</th>
                    <th className="col-rating">Rating</th>
                    <th className="col-status">Status</th>
                    <th className="col-joined">Joined</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        Loading employers from database...
                      </td>
                    </tr>
                  ) : filteredEmployers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                        No employers found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployers.map((emp) => {
                      const businessName = emp.business_name || "Profile Pending";
                      const initials = emp.business_name
                        ? emp.business_name.charAt(0).toUpperCase()
                        : emp.email.charAt(0).toUpperCase();
                      const logoUrl = emp.company_logo_path
                        ? (emp.company_logo_path.startsWith("http") || emp.company_logo_path.startsWith("/api")
                            ? emp.company_logo_path
                            : `/api/employers/${emp.user_id}/logo`)
                        : null;

                      return (
                        <tr key={emp.user_id}>
                          <td className="col-company">
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar" style={{ overflow: "hidden", position: "relative" }}>
                                {logoUrl && (
                                  <img
                                    src={logoUrl}
                                    alt={businessName}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                      if (e.currentTarget.nextElementSibling) {
                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                                      }
                                    }}
                                  />
                                )}
                                <span style={{ display: logoUrl ? "none" : "inline" }}>
                                  {initials}
                                </span>
                              </div>
                              <div>
                                <div className="admin-user-name">{businessName}</div>
                                <div className="admin-user-sub">{emp.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="col-industry">
                            <span>{emp.industry || "General Industry"}</span>
                            <div className="admin-user-sub">{emp.company_size || "Size not set"}</div>
                          </td>
                          <td className="col-location">
                            <span>{emp.city || "Cavite"}</span>
                          </td>
                          <td className="col-rating">
                            <div
                              className="rating-score-box"
                              title={emp.total_reviews ? `${emp.total_reviews} reviews` : "No reviews yet"}
                            >
                              <span className="star-icon">★</span>
                              <span>{emp.rating ? Number(emp.rating).toFixed(1) : "0.0"}</span>
                            </div>
                          </td>
                          <td className="col-status">
                            <span className={`admin-status-badge ${emp.is_active ? "active" : "suspended"}`}>
                              {emp.is_active ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="col-joined">
                            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                              {new Date(emp.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="col-actions">
                            <div className="admin-actions-cell">
                              <button
                                type="button"
                                className="admin-btn admin-btn-view"
                                onClick={() => setInspectingEmployer(emp)}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Employer Inspection Drawer */}
      {inspectingEmployer && (
        <div className="admin-drawer-overlay" onClick={() => setInspectingEmployer(null)}>
          <div className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <h2>Employer Profile</h2>
              <button
                type="button"
                className="admin-drawer-close"
                onClick={() => setInspectingEmployer(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Profile Card */}
              {(() => {
                const modalLogoUrl = inspectingEmployer.company_logo_path
                  ? (inspectingEmployer.company_logo_path.startsWith("http") || inspectingEmployer.company_logo_path.startsWith("/api")
                      ? inspectingEmployer.company_logo_path
                      : `/api/employers/${inspectingEmployer.user_id}/logo`)
                  : null;
                const modalInitials = inspectingEmployer.business_name
                  ? inspectingEmployer.business_name.charAt(0).toUpperCase()
                  : inspectingEmployer.email.charAt(0).toUpperCase();
                return (
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div className="admin-user-avatar" style={{ width: "52px", height: "52px", fontSize: "1.2rem", overflow: "hidden", position: "relative" }}>
                      {modalLogoUrl && (
                        <img
                          src={modalLogoUrl}
                          alt={inspectingEmployer.business_name || "Company"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline";
                            }
                          }}
                        />
                      )}
                      <span style={{ display: modalLogoUrl ? "none" : "inline" }}>
                        {modalInitials}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ margin: "0", color: "#01294a", fontSize: "1.15rem" }}>
                        {inspectingEmployer.business_name || "Company Profile"}
                      </h3>
                      <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                        {inspectingEmployer.email}
                      </p>
                      <div style={{ marginTop: "6px" }}>
                        <span className={`admin-status-badge ${inspectingEmployer.is_active ? "active" : "suspended"}`}>
                          {inspectingEmployer.is_active ? "Account Active" : "Account Suspended"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Company Info */}
              <div className="admin-drawer-section">
                <h4>Company Information</h4>
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", fontSize: "0.85rem", display: "grid", gap: "6px" }}>
                  <div><strong>Industry:</strong> {inspectingEmployer.industry || "Not specified"}</div>
                  <div><strong>Company Size:</strong> {inspectingEmployer.company_size || "Not specified"}</div>
                  <div><strong>Contact Phone:</strong> {inspectingEmployer.contact_number || "Not provided"}</div>
                  <div><strong>City:</strong> {inspectingEmployer.city || "Not provided"}</div>
                  <div><strong>Full Address:</strong> {inspectingEmployer.company_address || "Not provided"}</div>
                  <div><strong>Website:</strong> {inspectingEmployer.website ? <a href={inspectingEmployer.website} target="_blank" rel="noreferrer" style={{ color: "#0284c7" }}>{inspectingEmployer.website}</a> : "Not provided"}</div>
                </div>
              </div>

              {/* Description */}
              <div className="admin-drawer-section">
                <h4>About Company</h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: "1.5", background: "#f8fafc", padding: "14px", borderRadius: "8px" }}>
                  {inspectingEmployer.company_description || "No company description provided."}
                </p>
              </div>

              {/* Hiring Metrics */}
              <div className="admin-drawer-section">
                <h4>Hiring Activity</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#01294a" }}>
                      {inspectingEmployer.total_jobs}
                    </div>
                    <small style={{ color: "#64748b" }}>Jobs Posted</small>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#01294a" }}>
                      {inspectingEmployer.total_applications_received}
                    </div>
                    <small style={{ color: "#64748b" }}>Applications Received</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Static Bottom Actions */}
            <div className="admin-drawer-footer">
              <button
                type="button"
                className={`admin-btn ${inspectingEmployer.is_active ? "admin-btn-suspend" : "admin-btn-activate"}`}
                style={{ flex: 1, padding: "11px" }}
                disabled={isUpdating}
                onClick={() => handleToggleStatus(inspectingEmployer)}
              >
                {inspectingEmployer.is_active ? "Suspend Account" : "Activate Account"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-reset"
                style={{ flex: 1, padding: "11px" }}
                disabled={isUpdating}
                onClick={() => handleResetPassword(inspectingEmployer)}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE VERIFICATION: EMPLOYER STATUS TOGGLE MODAL */}
      <ConfirmationModal
        isOpen={!!statusEmployerTarget}
        type={statusEmployerTarget?.is_active ? "danger" : "success"}
        title={statusEmployerTarget?.is_active ? "Suspend Employer Account" : "Activate Employer Account"}
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to{" "}
              <strong>{statusEmployerTarget?.is_active ? "suspend" : "activate"}</strong> the account for{" "}
              <strong>{statusEmployerTarget?.business_name || statusEmployerTarget?.email}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              {statusEmployerTarget?.is_active
                ? "This employer will be immediately barred from logging in, publishing jobs, or contacting applicants."
                : "This employer will regain full access to their dashboard, active jobs, and applicant messages."}
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel={statusEmployerTarget?.is_active ? "Suspend Account" : "Activate Account"}
        isConfirming={isUpdating}
        onCancel={() => setStatusEmployerTarget(null)}
        onConfirm={doConfirmToggleStatus}
      />

      {/* DOUBLE VERIFICATION: RESET PASSWORD MODAL */}
      <ConfirmationModal
        isOpen={!!resetEmployerTarget}
        type="warning"
        title="Reset Employer Password"
        message={
          <div>
            <p style={{ margin: "0 0 8px" }}>
              Are you sure you want to reset the password for <strong>{resetEmployerTarget?.business_name || resetEmployerTarget?.email}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              A new temporary password will be generated and assigned to this employer account.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Reset Password"
        isConfirming={isUpdating}
        onCancel={() => setResetEmployerTarget(null)}
        onConfirm={doConfirmResetPassword}
      />
    </div>
  );
}
