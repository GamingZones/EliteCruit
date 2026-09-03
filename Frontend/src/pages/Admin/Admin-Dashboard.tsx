import React, { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import "./Admin-Dashboard.css";

interface PlatformStats {
  totalUsers: number;
  totalApplicants: number;
  totalEmployers: number;
  totalJobs: number;
}

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalApplicants: 0,
    totalEmployers: 0,
    totalJobs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Read logged in admin info
    try {
      const stored = localStorage.getItem("elitecruit-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setAdminUser(parsed);
      }
    } catch {}

    // 2. Fetch platform overview stats
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/overview-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          // Fallback initial counts if endpoint pending
          setStats({
            totalUsers: 25,
            totalApplicants: 18,
            totalEmployers: 6,
            totalJobs: 12,
          });
        }
      } catch {
        setStats({
          totalUsers: 25,
          totalApplicants: 18,
          totalEmployers: 6,
          totalJobs: 12,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminName = adminUser?.displayName || adminUser?.display_name || "System Administrator";

  return (
    <div className="admin-layout">
      {/* Reusable Admin Sidebar (empty navigation per user directive) */}
      <AdminSidebar activePath="/admin-dashboard" adminName={adminName} />

      {/* Main Admin Workspace Area */}
      <main className="admin-main">
        {/* Top Header - Matches Applicant & Employer Topbar */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Admin Overview</strong>
          </div>
          <div className="appdash-top-right">
            <span className="admin-status-pill">
              <span className="admin-status-dot" aria-hidden="true" />
              System Active
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
                managing user records, reviewing audit trails, and governing platform configurations.
              </p>
            </div>
            <div className="admin-welcome-icon" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 5 5v6c0 5.5 3.9 9.9 7 11 3.1-1.1 7-5.5 7-11V5l-7-3Zm0 3.1 4.5 1.9V11c0 3.9-2.6 7.2-4.5 8.1-1.9-.9-4.5-4.2-4.5-8.1V7l4.5-1.9Zm0 2.9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
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

            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Job Openings</span>
              <strong className="admin-stat-value">{isLoading ? "..." : stats.totalJobs}</strong>
              <span className="admin-stat-desc">Published job postings</span>
            </div>
          </div>

          {/* Workspace Readiness Panel */}
          <div className="admin-panel-card">
            <h3>Admin Management Workspace</h3>
            <p>
              Navigation modules will populate the sidebar as you develop administrative tools (User
              Management, Content Moderation, System Settings, Audit Logs).
            </p>
            <div className="admin-empty-state-wrap">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <p>Sidebar is currently set to clean mode. Ready for module additions.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
