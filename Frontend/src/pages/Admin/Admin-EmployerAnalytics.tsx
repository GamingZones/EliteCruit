import React, { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import "./Admin-EmployerAnalytics.css";
import { authFetch, getStoredUser } from "../../utils/auth";

interface EmployerAnalyticsData {
  totalEmployers: number;
  dominantIndustry: { sector: string; percentage: number; companies: number; color: string } | null;
  totalActiveJobs: number;
  totalPosts: number;
  urgentRatio: { count: number; percentage: number };
  industryBreakdown: { sector: string; percentage: number; companies: number; color: string }[];
  companySizes: { range: string; count: number; percentage: number; color: string }[];
  jobLocations: { city: string; openJobs: number; totalJobs?: number; percentage?: number; fillRate: number }[];
  postingStatus: { label: string; count: number; percentage: number; color: string }[];
}

const emptyAnalytics: EmployerAnalyticsData = {
  totalEmployers: 0,
  dominantIndustry: null,
  totalActiveJobs: 0,
  totalPosts: 0,
  urgentRatio: { count: 0, percentage: 0 },
  industryBreakdown: [],
  companySizes: [],
  jobLocations: [],
  postingStatus: [],
};

export default function AdminEmployerAnalytics() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<EmployerAnalyticsData>(emptyAnalytics);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      window.location.href = "/login";
      return;
    }
    setAdminUser(stored);

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await authFetch("/api/admin/employer-analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          setAnalytics(emptyAnalytics);
        }
      } catch {
        setAnalytics(emptyAnalytics);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const adminName = adminUser?.displayName || adminUser?.display_name || "System Administrator";

  return (
    <div className="admin-layout">
      <AdminSidebar activePath="/admin-employer-analytics" adminName={adminName} />

      <main className="admin-main">
        {/* Top Header */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Employer & Market Analytics</strong>
          </div>
          <div className="appdash-top-right">
            <span className="admin-status-pill">
              <span className="admin-status-dot" aria-hidden="true" />
              Market Intelligence
            </span>
            <span className="admin-role-badge">ADMIN</span>
          </div>
        </header>

        {/* Content Body */}
        <section className="admin-content">
          {/* Page Banner */}
          <div className="emp-analytics-header-card">
            <div>
              <h2>Employer Industry & Job Market Intelligence</h2>
              <p>
                Administrative overview of registered hiring organizations, corporate sector distribution,
                workforce size brackets, and regional job demand across Cavite.
              </p>
            </div>
            <div className="analytics-quick-nav">
              <a href="/admin-employers" className="btn-sec-nav">
                ← Back to Employer Records
              </a>
            </div>
          </div>

          {/* Quick Metrics Summary Strip */}
          <div className="emp-analytics-kpi-grid">
            <div className="emp-kpi-card">
              <span className="emp-kpi-title">Registered Employers</span>
              <strong className="emp-kpi-value">{isLoading ? "..." : analytics.totalEmployers}</strong>
              <small className="emp-kpi-sub">Verified hiring accounts</small>
            </div>
            <div className="emp-kpi-card">
              <span className="emp-kpi-title">Dominant Industry</span>
              <strong className="emp-kpi-value">
                {isLoading
                  ? "..."
                  : analytics.dominantIndustry
                  ? `${analytics.dominantIndustry.sector} (${analytics.dominantIndustry.percentage}%)`
                  : "None"}
              </strong>
              <small className="emp-kpi-sub">
                {isLoading
                  ? "..."
                  : analytics.dominantIndustry
                  ? `${analytics.dominantIndustry.companies} Partner Companies`
                  : "No industry records"}
              </small>
            </div>
            <div className="emp-kpi-card">
              <span className="emp-kpi-title">Total Active Jobs</span>
              <strong className="emp-kpi-value">
                {isLoading ? "..." : `${analytics.totalActiveJobs} Open Post${analytics.totalActiveJobs !== 1 ? "s" : ""}`}
              </strong>
              <small className="emp-kpi-sub">
                {isLoading
                  ? "..."
                  : `${analytics.totalPosts > 0 ? Math.round((analytics.totalActiveJobs / analytics.totalPosts) * 100) : 0}% of total postings`}
              </small>
            </div>
            <div className="emp-kpi-card">
              <span className="emp-kpi-title">Urgent Hiring Ratio</span>
              <strong className="emp-kpi-value">
                {isLoading ? "..." : `${analytics.urgentRatio.percentage}% Urgent`}
              </strong>
              <small className="emp-kpi-sub">
                {isLoading
                  ? "..."
                  : `${analytics.urgentRatio.count} High-priority post${analytics.urgentRatio.count !== 1 ? "s" : ""}`}
              </small>
            </div>
          </div>

          {/* Analytics Cards Grid */}
          <div className="emp-analytics-grid">
            {/* Graph 1: Industry Sector Breakdown */}
            <div className="emp-graph-card">
              <div className="emp-graph-header">
                <h3>Employer Industry Sector Distribution</h3>
                <span className="emp-graph-badge">Sectors</span>
              </div>
              <p className="emp-graph-desc">Market breakdown of employer clients across industry categories.</p>

              {analytics.industryBreakdown.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No employer industry records yet.
                </div>
              ) : (
                (() => {
                  let cumulative = 0;
                  return (
                    <div className="emp-donut-container">
                      <svg className="emp-donut-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="16" />
                        {analytics.industryBreakdown.map((item) => {
                          const dash = (item.percentage / 100) * 238.76;
                          const offset = -cumulative;
                          cumulative += dash;
                          return (
                            <circle
                              key={item.sector}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="16"
                              strokeDasharray={`${dash} 238.76`}
                              strokeDashoffset={offset}
                            />
                          );
                        })}
                      </svg>
                      <div className="emp-donut-legend">
                        {analytics.industryBreakdown.map((item) => (
                          <div key={item.sector} className="emp-legend-item">
                            <span className="emp-legend-dot" style={{ backgroundColor: item.color }} />
                            <div className="emp-legend-info">
                              <strong>{item.sector}</strong>
                              <small>
                                {item.percentage}% ({item.companies} employer{item.companies !== 1 ? "s" : ""})
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Graph 2: Company Size Distribution */}
            <div className="emp-graph-card">
              <div className="emp-graph-header">
                <h3>Company Workforce Size Brackets</h3>
                <span className="emp-graph-badge">Company Scale</span>
              </div>
              <p className="emp-graph-desc">Classification of employer accounts by organizational employee count.</p>

              {analytics.companySizes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No company workforce records yet.
                </div>
              ) : (
                <div className="emp-bar-vertical">
                  {analytics.companySizes.map((item) => (
                    <div key={item.range} className="emp-bar-vitem">
                      <div className="emp-bar-vtrack">
                        <div
                          className="emp-bar-vfill"
                          style={{ height: `${Math.max(item.percentage, 8)}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <strong className="emp-bar-vval">{item.count}</strong>
                      <span className="emp-bar-vlbl">{item.range}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 3: Job Openings by Location */}
            <div className="emp-graph-card">
              <div className="emp-graph-header">
                <h3>Job Openings by Municipal Hub</h3>
                <span className="emp-graph-badge">Regional Demand</span>
              </div>
              <p className="emp-graph-desc">Active job openings listed across Cavite business districts.</p>

              {analytics.jobLocations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No regional job openings recorded yet.
                </div>
              ) : (
                <div className="emp-hbar-list">
                  {analytics.jobLocations.map((item) => (
                    <div key={item.city} className="emp-hbar-row">
                      <div className="emp-hbar-meta">
                        <span>{item.city}</span>
                        <strong>{item.openJobs} active listing{item.openJobs !== 1 ? "s" : ""}</strong>
                      </div>
                      <div className="emp-hbar-track">
                        <div className="emp-hbar-fill" style={{ width: `${Math.max(item.percentage ?? item.fillRate, 8)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 4: Job Posting Status & Urgency */}
            <div className="emp-graph-card">
              <div className="emp-graph-header">
                <h3>Job Post Status & Priority Ratio</h3>
                <span className="emp-graph-badge">Posting Velocity</span>
              </div>
              <p className="emp-graph-desc">Proportion of active vs closed postings and urgent hiring demands.</p>

              {analytics.postingStatus.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No job posting records yet.
                </div>
              ) : (
                <div className="status-ratio-container">
                  {analytics.postingStatus.map((st) => (
                    <div key={st.label} className="status-ratio-box" style={{ borderLeftColor: st.color }}>
                      <div className="status-ratio-details">
                        <span className="status-ratio-lbl">{st.label}</span>
                        <strong className="status-ratio-val">
                          {st.count} Listing{st.count !== 1 ? "s" : ""} ({st.percentage}%)
                        </strong>
                      </div>
                      <div className="status-progress-track">
                        <div
                          className="status-progress-fill"
                          style={{ width: `${Math.max(st.percentage, 5)}%`, backgroundColor: st.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
