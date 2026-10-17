import React, { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import "./Admin-ApplicantAnalytics.css";
import { authFetch, getStoredUser } from "../../utils/auth";

interface ApplicantAnalyticsData {
  totalApplicants: number;
  topLocation: { city: string; percentage: number; count: number } | null;
  topArrangement: { arrangement: string; percentage: number; count: number } | null;
  placementRate: string;
  cityDistribution: { city: string; count: number; percentage: number; color: string }[];
  skillsSupply: { skill: string; candidates: number; level: number }[];
  workPreferences: { arrangement: string; percentage: number; count: number; color: string }[];
  applicationPipeline: { stage: string; count: number; conversion: string; color: string }[];
}

const emptyAnalytics: ApplicantAnalyticsData = {
  totalApplicants: 0,
  topLocation: null,
  topArrangement: null,
  placementRate: "0.0%",
  cityDistribution: [],
  skillsSupply: [],
  workPreferences: [],
  applicationPipeline: [],
};

export default function AdminApplicantAnalytics() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<ApplicantAnalyticsData>(emptyAnalytics);
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
        const res = await authFetch("/api/admin/applicant-analytics");
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
  const maxPipelineCount = Math.max(analytics.applicationPipeline[0]?.count || 1, 1);

  return (
    <div className="admin-layout">
      <AdminSidebar activePath="/admin-applicant-analytics" adminName={adminName} />

      <main className="admin-main">
        {/* Top Header */}
        <header className="appdash-topbar">
          <div className="appdash-top-left">
            <strong>Applicant Analytics & Intelligence</strong>
          </div>
          <div className="appdash-top-right">
            <span className="admin-status-pill">
              <span className="admin-status-dot" aria-hidden="true" />
              Live Analytics Mode
            </span>
            <span className="admin-role-badge">ADMIN</span>
          </div>
        </header>

        {/* Content Body */}
        <section className="admin-content">
          {/* Page Banner */}
          <div className="analytics-header-card">
            <div>
              <h2>Applicant Pool Insights & Distribution</h2>
              <p>
                Comprehensive data visualizations covering jobseeker demographics, skill inventory,
                workplace arrangement preferences, and conversion funnel performance.
              </p>
            </div>
            <div className="analytics-quick-nav">
              <a href="/admin-applicants" className="btn-sec-nav">
                ← Back to Candidate Records
              </a>
            </div>
          </div>

          {/* Quick Metrics Summary Strip */}
          <div className="analytics-kpi-grid">
            <div className="kpi-card">
              <span className="kpi-title">Total Active Applicants</span>
              <strong className="kpi-value">{isLoading ? "..." : analytics.totalApplicants}</strong>
              <small className="kpi-sub">Registered across Cavite</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Top Talent Location</span>
              <strong className="kpi-value">
                {isLoading
                  ? "..."
                  : analytics.topLocation
                  ? `${analytics.topLocation.city} (${analytics.topLocation.percentage}%)`
                  : "None"}
              </strong>
              <small className="kpi-sub">
                {isLoading
                  ? "..."
                  : analytics.topLocation
                  ? `${analytics.topLocation.count} Active Jobseekers`
                  : "No location records"}
              </small>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Preferred Model</span>
              <strong className="kpi-value">
                {isLoading
                  ? "..."
                  : analytics.topArrangement
                  ? `${analytics.topArrangement.arrangement} (${analytics.topArrangement.percentage}%)`
                  : "None"}
              </strong>
              <small className="kpi-sub">
                {isLoading
                  ? "..."
                  : analytics.topArrangement
                  ? `${analytics.topArrangement.count} Jobseekers`
                  : "No preference records"}
              </small>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Placement Rate</span>
              <strong className="kpi-value">{isLoading ? "..." : analytics.placementRate}</strong>
              <small className="kpi-sub">Applications to Hire</small>
            </div>
          </div>

          {/* Graphs Grid */}
          <div className="analytics-grid">
            {/* Graph 1: Cavite City Distribution */}
            <div className="graph-card">
              <div className="graph-card-header">
                <h3>Applicant Location Distribution (Cavite)</h3>
                <span className="graph-badge">Geographic</span>
              </div>
              <p className="graph-desc">Geographic distribution of jobseekers across key Cavite municipalities.</p>

              {analytics.cityDistribution.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No applicant location data recorded yet.
                </div>
              ) : (
                <div className="bar-chart-vertical">
                  {analytics.cityDistribution.map((item) => (
                    <div key={item.city} className="bar-vertical-item">
                      <div className="bar-vertical-track">
                        <div
                          className="bar-vertical-fill"
                          style={{ height: `${Math.max(item.percentage, 8)}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <strong className="bar-val">{item.count}</strong>
                      <span className="bar-lbl">{item.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 2: Top Skills & Competencies */}
            <div className="graph-card">
              <div className="graph-card-header">
                <h3>Top Competencies & Skill Inventory</h3>
                <span className="graph-badge">Skills</span>
              </div>
              <p className="graph-desc">Volume of registered candidates matching key industry skills.</p>

              {analytics.skillsSupply.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No candidate skills recorded yet.
                </div>
              ) : (
                <div className="horizontal-bar-list">
                  {analytics.skillsSupply.map((item) => (
                    <div key={item.skill} className="hbar-row">
                      <div className="hbar-label-row">
                        <span>{item.skill}</span>
                        <strong>{item.candidates} candidate{item.candidates !== 1 ? "s" : ""}</strong>
                      </div>
                      <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${Math.max(item.level, 8)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 3: Preferred Work Arrangement */}
            <div className="graph-card">
              <div className="graph-card-header">
                <h3>Preferred Work Arrangement</h3>
                <span className="graph-badge">Preferences</span>
              </div>
              <p className="graph-desc">Candidate breakdown by target workplace flexibility model.</p>

              {analytics.workPreferences.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No workplace preference records yet.
                </div>
              ) : (
                (() => {
                  let cumulative = 0;
                  return (
                    <div className="donut-chart-container">
                      <svg className="donut-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="16" />
                        {analytics.workPreferences.map((pref) => {
                          const dash = (pref.percentage / 100) * 238.76;
                          const offset = -cumulative;
                          cumulative += dash;
                          return (
                            <circle
                              key={pref.arrangement}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke={pref.color}
                              strokeWidth="16"
                              strokeDasharray={`${dash} 238.76`}
                              strokeDashoffset={offset}
                            />
                          );
                        })}
                      </svg>
                      <div className="donut-legend">
                        {analytics.workPreferences.map((pref) => (
                          <div key={pref.arrangement} className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: pref.color }} />
                            <div className="legend-info">
                              <strong>{pref.arrangement}</strong>
                              <small>
                                {pref.percentage}% ({pref.count} candidate{pref.count !== 1 ? "s" : ""})
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

            {/* Graph 4: Application Funnel Conversion */}
            <div className="graph-card">
              <div className="graph-card-header">
                <h3>Application Pipeline & Conversion Funnel</h3>
                <span className="graph-badge">Recruitment Funnel</span>
              </div>
              <p className="graph-desc">Step-by-step conversion of job applications across hiring stages.</p>

              {analytics.applicationPipeline.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                  No application activity recorded yet.
                </div>
              ) : (
                <div className="funnel-container">
                  {analytics.applicationPipeline.map((stage) => (
                    <div key={stage.stage} className="funnel-row">
                      <div className="funnel-meta">
                        <span className="funnel-name">{stage.stage}</span>
                        <strong className="funnel-count">{stage.count} ({stage.conversion})</strong>
                      </div>
                      <div className="funnel-track">
                        <div
                          className="funnel-fill"
                          style={{
                            width: `${maxPipelineCount > 0 ? (stage.count / maxPipelineCount) * 100 : 0}%`,
                            backgroundColor: stage.color,
                          }}
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
