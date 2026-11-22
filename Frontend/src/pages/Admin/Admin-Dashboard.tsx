import React, { useEffect, useState, useCallback } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import ConfirmationModal from "../../components/ConfirmationModal";
import "./Admin-Dashboard.css";
import { authFetch, getStoredUser } from "../../utils/auth";

interface PlatformStats {
  totalUsers: number;
  totalApplicants: number;
  totalEmployers: number;
  totalJobs: number;
}

interface ApplicantAnalyticsSummary {
  totalApplicants: number;
  topLocation: { city: string; percentage: number; count: number } | null;
  topArrangement: { arrangement: string; percentage: number; count: number } | null;
  placementRate: string;
  cityDistribution: { city: string; count: number; percentage: number; color: string }[];
  skillsSupply: { skill: string; candidates: number; level: number }[];
}

interface EmployerAnalyticsSummary {
  totalEmployers: number;
  dominantIndustry: { sector: string; percentage: number; companies: number; color: string } | null;
  totalActiveJobs: number;
  totalPosts: number;
  urgentRatio: { count: number; percentage: number };
  jobLocations: { city: string; openJobs: number; totalJobs?: number; fillRate: number; percentage?: number }[];
  postingStatus: { label: string; count: number; percentage: number; color: string }[];
}

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalApplicants: 0,
    totalEmployers: 0,
    totalJobs: 0,
  });
  const [applicantData, setApplicantData] = useState<ApplicantAnalyticsSummary | null>(null);
  const [employerData, setEmployerData] = useState<EmployerAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Unregister modal & action states
  const [isUnregisterModalOpen, setIsUnregisterModalOpen] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, appRes, empRes] = await Promise.all([
        authFetch("/api/admin/overview-stats"),
        authFetch("/api/admin/applicant-analytics"),
        authFetch("/api/admin/employer-analytics"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplicantData(appData);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployerData(empData);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Read logged in admin info and enforce admin role
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      window.location.href = "/login";
      return;
    }
    setAdminUser(stored);

    fetchData();
  }, [fetchData]);

  const handleConfirmUnregister = async () => {
    setIsUnregistering(true);
    setErrorMessage(null);
    try {
      const res = await authFetch("/api/admin/unregister-zaki-both-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && data?.success) {
        setIsUnregisterModalOpen(false);
        setSuccessMessage(
          "Both presentation accounts (zakiablando897@gmail.com and zaki_ablando897@yahoo.com) have been completely unregistered and removed from the database."
        );
        fetchData();
      } else {
        setErrorMessage(data?.error || data?.message || `Server returned status ${res.status}. Please try again.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while unregistering accounts.");
    } finally {
      setIsUnregistering(false);
    }
  };

  const adminName = adminUser?.displayName || adminUser?.display_name || "System Administrator";

  return (
    <div className="admin-layout">
      {/* Reusable Admin Sidebar */}
      <AdminSidebar activePath="/admin-dashboard" adminName={adminName} />

      {/* Main Admin Workspace Area */}
      <main className="admin-main">
        {/* Top Header - Matches Applicant & Employer Topbar */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Admin Overview</strong>
          </div>
          <div className="appdash-top-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="admin-topbar-action-btn"
              onClick={() => setIsUnregisterModalOpen(true)}
              title="Unregister presentation demo accounts (zakiablando897@gmail.com & zaki_ablando897@yahoo.com)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="18" y1="8" x2="23" y2="13" />
                <line x1="23" y1="8" x2="18" y2="13" />
              </svg>
              Unregister Demo Accounts
            </button>
            <span className="admin-status-pill">
              <span className="admin-status-dot" aria-hidden="true" />
              Live Database Connected
            </span>
            <span className="admin-role-badge">ADMIN</span>
          </div>
        </header>

        {/* Content Section */}
        <section className="admin-content">
          {/* Welcome Banner */}
          <div className="admin-welcome-card">
            <div>
              <h2>Welcome back, Administrator</h2>
              <p>
                This is your central administrative hub for monitoring EliteCruit system activity,
                talent pool supply, hiring demand, and platform operations.
              </p>
            </div>
            <div className="admin-welcome-icon" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm0 3.1 4.5 1.9V11c0 3.9-2.6 7.2-4.5 8.1-1.9-.9-4.5-4.2-4.5-8.1V7l4.5-1.9Zm0 2.9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
            </div>
          </div>

          {/* Quick Demo Accounts Maintenance Card */}
          <div className="admin-demo-card">
            <div className="admin-demo-card-left">
              <div className="admin-demo-badge">Presentation Accounts</div>
              <h3>Reset / Unregister Presentation Accounts</h3>
              <p>
                Completely unregister both accounts: <strong>zakiablando897@gmail.com</strong> (Employer &ndash; TechNova) and <strong>zaki_ablando897@yahoo.com</strong> (Applicant &ndash; Juan Carlos) so you can test complete registration, OTP email verification, and profile onboarding from scratch.
              </p>
            </div>
            <div className="admin-demo-card-right">
              <button
                type="button"
                className="admin-btn-unregister"
                onClick={() => setIsUnregisterModalOpen(true)}
                disabled={isUnregistering}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="18" y1="8" x2="23" y2="13" />
                  <line x1="23" y1="8" x2="18" y2="13" />
                </svg>
                {isUnregistering ? "Unregistering..." : "Unregister Both Accounts"}
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Platform Users</span>
              <strong className="admin-stat-value">{isLoading ? "..." : stats.totalUsers}</strong>
              <span className="admin-stat-desc">Registered accounts</span>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-label">Candidates / Applicants</span>
              <strong className="admin-stat-value">{isLoading ? "..." : stats.totalApplicants}</strong>
              <span className="admin-stat-desc">Active jobseekers</span>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-label">Companies / Employers</span>
              <strong className="admin-stat-value">{isLoading ? "..." : stats.totalEmployers}</strong>
              <span className="admin-stat-desc">Hiring organizations</span>
            </div>

            <a href="/admin-jobs" className="admin-stat-card" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }} title="Manage Job Postings">
              <span className="admin-stat-label">Active Job Openings</span>
              <strong className="admin-stat-value">{isLoading ? "..." : stats.totalJobs}</strong>
              <span className="admin-stat-desc">Click to manage job postings ↗</span>
            </a>
          </div>

          {/* Visual Analytics Overview Grid */}
          <div className="admin-overview-grid">
            {/* Card 1: Talent Pool & Skills Insights */}
            <div className="admin-overview-card">
              <div className="overview-card-header">
                <div>
                  <h3>Talent Pool & Skills Supply</h3>
                  <p>Real-time candidate competencies and location metrics across Cavite.</p>
                </div>
                <span className="overview-badge">Talent Pool</span>
              </div>

              <div className="overview-highlights">
                <div className="overview-highlight-pill">
                  <span>Top Hub</span>
                  <strong>{applicantData?.topLocation?.city || "None recorded"}</strong>
                </div>
                <div className="overview-highlight-pill">
                  <span>Work Preference</span>
                  <strong>{applicantData?.topArrangement?.arrangement || "Not set"}</strong>
                </div>
                <div className="overview-highlight-pill">
                  <span>Placement Rate</span>
                  <strong>{applicantData?.placementRate || "0.0%"}</strong>
                </div>
              </div>

              <div className="overview-bars-section">
                <strong style={{ fontSize: "0.85rem", color: "#01294a" }}>Top Registered Competencies</strong>
                {isLoading ? (
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>Loading live metrics...</p>
                ) : !applicantData || applicantData.skillsSupply.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>No candidate skills recorded yet.</p>
                ) : (
                  applicantData.skillsSupply.slice(0, 3).map((item) => (
                    <div key={item.skill} className="overview-bar-row">
                      <div className="overview-bar-meta">
                        <span>{item.skill}</span>
                        <strong>{item.candidates} candidate{item.candidates !== 1 ? "s" : ""}</strong>
                      </div>
                      <div className="overview-bar-track">
                        <div className="overview-bar-fill" style={{ width: `${Math.max(item.level, 10)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="overview-card-footer">
                <a href="/admin-applicant-analytics" className="overview-link-btn">
                  Explore Full Applicant Analytics →
                </a>
              </div>
            </div>

            {/* Card 2: Employer Market & Regional Demand */}
            <div className="admin-overview-card">
              <div className="overview-card-header">
                <div>
                  <h3>Regional Demand & Job Market</h3>
                  <p>Active hiring hubs, corporate sectors, and job posting activity.</p>
                </div>
                <span className="overview-badge">Market Demand</span>
              </div>

              <div className="overview-highlights">
                <div className="overview-highlight-pill">
                  <span>Top Sector</span>
                  <strong>{employerData?.dominantIndustry?.sector || "General"}</strong>
                </div>
                <div className="overview-highlight-pill">
                  <span>Urgent Postings</span>
                  <strong>{employerData?.urgentRatio?.percentage || 0}% Urgent</strong>
                </div>
                <div className="overview-highlight-pill">
                  <span>Active Listings</span>
                  <strong>{employerData?.totalActiveJobs || 0} Open</strong>
                </div>
              </div>

              <div className="overview-bars-section">
                <strong style={{ fontSize: "0.85rem", color: "#01294a" }}>Job Openings by Municipal Hub</strong>
                {isLoading ? (
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>Loading live metrics...</p>
                ) : !employerData || employerData.jobLocations.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>No municipal job listings recorded yet.</p>
                ) : (
                  employerData.jobLocations.slice(0, 3).map((item) => (
                    <div key={item.city} className="overview-bar-row">
                      <div className="overview-bar-meta">
                        <span>{item.city}</span>
                        <strong>{item.openJobs} active listing{item.openJobs !== 1 ? "s" : ""}</strong>
                      </div>
                      <div className="overview-bar-track">
                        <div
                          className="overview-bar-fill"
                          style={{
                            width: `${Math.max(item.percentage ?? item.fillRate, 10)}%`,
                            background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="overview-card-footer">
                <a href="/admin-employer-analytics" className="overview-link-btn">
                  Explore Full Employer Analytics →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* UNREGISTER CONFIRMATION MODAL (RULE 6 COMPLIANT) */}
      <ConfirmationModal
        isOpen={isUnregisterModalOpen}
        type="warning"
        title="Unregister Both Accounts"
        message={
          <div>
            Are you sure you want to completely unregister both presentation accounts?
            <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", textAlign: "left", fontSize: "0.85rem", border: "1px solid #e2e8f0" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>Employer:</strong> <span>zakiablando897@gmail.com</span> (TechNova)
              </div>
              <div>
                <strong>Applicant:</strong> <span>zaki_ablando897@yahoo.com</span> (Juan Carlos)
              </div>
            </div>
            <p style={{ marginTop: "10px", marginBottom: "0", fontSize: "0.82rem", color: "#64748b" }}>
              This will permanently delete both user accounts, company profiles, job posts, applications, and chat messages so they can be registered anew.
            </p>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel={isUnregistering ? "Unregistering..." : "Yes, Unregister Both"}
        isConfirming={isUnregistering}
        onCancel={() => setIsUnregisterModalOpen(false)}
        onConfirm={handleConfirmUnregister}
      />

      {/* SUCCESS POPUP MODAL (RULE 6 COMPLIANT) */}
      <ConfirmationModal
        isOpen={!!successMessage}
        type="warning"
        title="Accounts Unregistered"
        message={successMessage}
        hideCancel={true}
        confirmLabel="OK"
        onConfirm={() => setSuccessMessage(null)}
      />

      {/* ERROR POPUP MODAL (RULE 6 COMPLIANT) */}
      <ConfirmationModal
        isOpen={!!errorMessage}
        type="warning"
        title="Unregister Failed"
        message={errorMessage}
        hideCancel={true}
        confirmLabel="OK"
        onConfirm={() => setErrorMessage(null)}
      />
    </div>
  );
}
