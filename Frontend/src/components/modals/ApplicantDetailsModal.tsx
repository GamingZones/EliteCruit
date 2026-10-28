import React, { useState } from "react";
import "./ApplicantDetailsModal.css";

export type WorkExpItem = {
  id?: string | number;
  title: string;
  company: string;
  city?: string;
  province?: string;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  isCurrent?: boolean;
  employmentType?: string;
  responsibilities?: string;
  skills?: string[];
};

export type CandidateModalData = {
  user_id?: number | string;
  id?: number | string;
  applicant_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  address?: string;
  rating?: number | string | null;
  profile_picture_path?: string | null;
  summary?: string;
  languages?: string | string[];
  desired_job_title?: string;
  expected_salary?: number | string | null;
  expected_salary_min?: number | string | null;
  expected_salary_max?: number | string | null;
  work_arrangement?: string;
  nearby_location?: string;
  preferred_locations?: string | string[];
  skills?: string | string[];
  qualifications?: string | string[];
  certifications?: string | string[];
  shs_strand?: string;
  shs_school?: string;
  shs_grad_year?: string | number;
  college_course?: string;
  college_school?: string;
  college_grad_year?: string | number;
  vocational_course?: string;
  vocational_grad_year?: string | number;
  years_of_experience?: string | number;
  work_experience_json?: string;
  resume_path?: string | null;
  documents?: Array<{ id: string | number; file_name: string; url?: string }>;
};

export type ApplicantDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateModalData | null;
  customFooterActions?: React.ReactNode;
};

export default function ApplicantDetailsModal({
  isOpen,
  onClose,
  candidate,
  customFooterActions,
}: ApplicantDetailsModalProps) {
  const [candDetailTab, setCandDetailTab] = useState<"personal" | "preferences" | "competencies" | "experience">("personal");
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);
  const [docsList, setDocsList] = useState<Array<{ id: string | number; file_name: string; url?: string }>>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ file_name: string; url: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setIsDocsDrawerOpen(false);
      setPreviewDoc(null);
      setCandDetailTab("personal");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (candidate?.documents && candidate.documents.length > 0) {
      setDocsList(candidate.documents);
      return;
    }
    const candUserId = candidate?.user_id || candidate?.id;
    if (candUserId && isOpen) {
      setIsDocsLoading(true);
      fetch(`/api/applicants/${candUserId}/documents`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data?.documents)) {
            setDocsList(data.documents);
          }
        })
        .catch(() => {})
        .finally(() => setIsDocsLoading(false));
    }
  }, [candidate?.user_id, candidate?.id, candidate?.documents, isOpen]);

  if (!isOpen || !candidate) return null;

  const candUserId = candidate.user_id || candidate.id;
  const displayName =
    candidate.applicant_name ||
    candidate.name ||
    (candidate.first_name || candidate.last_name
      ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()
      : "Applicant Details");

  const locationStr =
    candidate.city || candidate.province || candidate.address || "Cavite";

  const parseItemList = (data: any, fallback: string[] = []): string[] => {
    if (!data) return fallback;
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
    return String(data)
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const isShsItem = (q: string) => {
    const lower = q.toLowerCase();
    return (
      lower.includes("strand") ||
      lower.includes("senior high") ||
      lower.includes("shs") ||
      lower.includes("stem") ||
      lower.includes("abm") ||
      lower.includes("humss") ||
      lower.includes("gas") ||
      lower.includes("tvl")
    );
  };

  const parseCandidateSalaryRange = (c: CandidateModalData) => {
    if (c.expected_salary_min && c.expected_salary_max) {
      return {
        min: `PHP ${Number(c.expected_salary_min).toLocaleString()}`,
        max: `PHP ${Number(c.expected_salary_max).toLocaleString()}`,
      };
    }
    if (c.expected_salary) {
      return {
        min: `PHP ${Number(c.expected_salary).toLocaleString()}`,
        max: "Negotiable",
      };
    }
    return { min: "Negotiable", max: "Negotiable" };
  };

  const profilePicSrc = candidate.profile_picture_path
    ? candidate.profile_picture_path.startsWith("http") || candidate.profile_picture_path.startsWith("/api")
      ? candidate.profile_picture_path
      : candUserId ? `/api/applicants/${candUserId}/profile-picture` : null
    : candUserId ? `/api/applicants/${candUserId}/profile-picture` : null;

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const allQuals = parseItemList(candidate.qualifications, []);
  const shsList = allQuals.filter(isShsItem);
  const collegeList = allQuals.filter((q) => !isShsItem(q));
  const skillsList = parseItemList(candidate.skills, []);
  const certList = parseItemList(candidate.certifications, []);
  const langList = parseItemList(candidate.languages, []);
  const prefLocs = parseItemList(candidate.preferred_locations, []);

  let parsedWorkExp: WorkExpItem[] = [];
  if (candidate.work_experience_json) {
    try {
      const parsed = JSON.parse(candidate.work_experience_json);
      if (Array.isArray(parsed)) parsedWorkExp = parsed;
    } catch {}
  }

  return (
    <div
      className="cand-details-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Applicant Details"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="jd-modal-container" style={{ maxWidth: "920px" }} onClick={(e) => e.stopPropagation()}>
        <div className="cand-details-panel jd-panel">
          {/* Candidate Strip */}
          <div className="cand-details-strip" style={{ paddingTop: "20px" }}>
            <div className="cand-details-logo-info">
              <div className="cand-details-logo" aria-label="Candidate initials">
                {profilePicSrc ? (
                  <img
                    src={profilePicSrc}
                    alt={displayName}
                    style={{ width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                    {initials}
                  </span>
                )}
              </div>
              <div>
                <strong className="cand-details-name">{displayName}</strong>
                <span className="cand-details-location" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "3px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {locationStr}
                  </span>
                  {candidate.email && (
                    <>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-10 7L2 7" />
                        </svg>
                        {candidate.email}
                      </span>
                    </>
                  )}
                  {candidate.phone && (
                    <>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {candidate.phone}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="cand-details-header-right">
              <div className="rating-score-box" title="Applicant rating">
                <span className="star-icon">★</span>
                <span>{candidate.rating ? Number(candidate.rating).toFixed(1) : "0.0"}</span>
              </div>
              <button
                type="button"
                className={`cand-details-docs-btn ${isDocsDrawerOpen ? "active" : ""}`}
                onClick={() => setIsDocsDrawerOpen((prev) => !prev)}
              >
                Docs
              </button>
            </div>
          </div>

          {/* 4-Section Navigation Tabs */}
          <div className="cand-modal-nav-wrap">
            <nav className="profile-section-nav cand-modal-tabs" aria-label="Profile Sections">
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "personal" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("personal"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">1</span>
                <span>Personal & Contact</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "preferences" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("preferences"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">2</span>
                <span>Career Preferences</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "competencies" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("competencies"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">3</span>
                <span>Skills & Credentials</span>
              </button>
              <button
                type="button"
                className={`cand-modal-tab-btn ${candDetailTab === "experience" ? "active" : ""}`}
                onClick={() => { setCandDetailTab("experience"); setIsDocsDrawerOpen(false); setPreviewDoc(null); }}
              >
                <span className="tab-num">4</span>
                <span>Work Experience</span>
              </button>
            </nav>
          </div>

          <div className="cand-details-body-wrapper" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="cand-details-body">
              {/* TAB 1: PERSONAL & CONTACT */}
              {candDetailTab === "personal" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Professional Summary
                    </h4>
                    <p style={{ margin: 0, color: "#334155", lineHeight: 1.6, fontSize: "0.95rem" }}>
                      {candidate.summary || "No professional summary provided by the applicant."}
                    </p>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Languages Spoken
                    </h4>
                    <div className="jd-tags-wrap">
                      {langList.length > 0 ? (
                        langList.map((lang, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{lang}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No specific languages specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAREER PREFERENCES */}
              {candDetailTab === "preferences" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Career Target
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Desired Job Title</small>
                        <span className="company-info-card-val" style={{ color: "#0284c7" }}>
                          {candidate.desired_job_title || "Not specified"}
                        </span>
                      </div>
                      {(() => {
                        const sal = parseCandidateSalaryRange(candidate);
                        return (
                          <>
                            <div className="company-info-card">
                              <small className="company-info-card-label">Minimum Expected Salary</small>
                              <span className="company-info-card-val">{sal.min}</span>
                            </div>
                            <div className="company-info-card">
                              <small className="company-info-card-label">Maximum Expected Salary</small>
                              <span className="company-info-card-val">{sal.max}</span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="company-info-card">
                        <small className="company-info-card-label">Work Arrangement</small>
                        <span className="setup-pill" style={{ alignSelf: "flex-start", marginTop: "2px", display: "inline-block" }}>
                          {candidate.work_arrangement || "On-site"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Geographic & Discovery Location
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Designated Nearby Location</small>
                        <span className="company-info-card-val" style={{ color: "#0284c7" }}>
                          {candidate.nearby_location || candidate.city || "Not designated"}
                        </span>
                      </div>
                      <div className="company-info-card">
                        <small className="company-info-card-label">Home Address / Municipality</small>
                        <span className="company-info-card-val">
                          {candidate.address || candidate.city || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Preferred Work Locations
                    </h4>
                    <div className="jd-tags-wrap">
                      {prefLocs.length > 0 ? (
                        prefLocs.map((loc, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{loc}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No preferred location restrictions specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SKILLS & CREDENTIALS */}
              {candDetailTab === "competencies" && (
                <div className="cand-tab-content">
                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Senior High School & Vocational
                    </h4>
                    <div className="jd-tags-wrap">
                      {shsList.length > 0 ? (
                        shsList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No senior high / vocational records listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      College & Tertiary Education
                    </h4>
                    <div className="jd-tags-wrap">
                      {collegeList.length > 0 ? (
                        collegeList.map((q, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-qualification">{q}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No college / tertiary degree listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px", marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Core Technical Skills
                    </h4>
                    <div className="jd-tags-wrap">
                      {skillsList.length > 0 ? (
                        skillsList.map((s, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-skill">{s}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No technical skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="cand-details-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 20px", borderRadius: "10px" }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                      Professional Certifications
                    </h4>
                    <div className="jd-tags-wrap">
                      {certList.length > 0 ? (
                        certList.map((c, idx) => (
                          <span key={idx} className="js-tag-chip js-tag-certification">{c}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No certifications listed</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WORK EXPERIENCE */}
              {candDetailTab === "experience" && (
                <div className="cand-tab-content">
                  {candidate.years_of_experience && (
                    <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", color: "#0369a1", fontSize: "0.92rem" }}>
                      <strong>Total Professional Experience:</strong> {candidate.years_of_experience}
                    </div>
                  )}

                  {parsedWorkExp.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "36px 20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                        No employment history entries added by the applicant.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {parsedWorkExp.map((exp, idx) => (
                        <div key={exp.id || idx} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <h4 style={{ margin: "0 0 2px", fontSize: "1rem", color: "#0f172a" }}>{exp.title}</h4>
                              <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>{exp.company}</span>
                              {(exp.city || exp.province) && (
                                <span style={{ fontSize: "0.84rem", color: "#94a3b8" }}> • {[exp.city, exp.province].filter(Boolean).join(", ")}</span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                              {exp.isCurrent
                                ? `${exp.startMonth || ""} ${exp.startYear || ""} - Present`
                                : `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.endMonth || ""} ${exp.endYear || ""}`}
                              {exp.employmentType && (
                                <span className="setup-pill" style={{ marginLeft: "8px" }}>{exp.employmentType}</span>
                              )}
                            </div>
                          </div>
                          {exp.responsibilities && (
                            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "0.88rem", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                              {exp.responsibilities}
                            </p>
                          )}
                          {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                            <div className="jd-tags-wrap" style={{ marginTop: "10px" }}>
                              {exp.skills.map((sk, sIdx) => (
                                <span key={sIdx} className="js-tag-chip js-tag-skill" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Slide-in Docs Drawer */}
            <div className={`jd-faq-drawer ${isDocsDrawerOpen ? "open" : ""}`}>
              <div className="jd-faq-header">
                <h3>{previewDoc ? "Document Preview" : "Candidate Documents"}</h3>
                <button
                  type="button"
                  className="jd-faq-back-btn"
                  onClick={() => {
                    if (previewDoc) setPreviewDoc(null);
                    else setIsDocsDrawerOpen(false);
                  }}
                >
                  ←
                </button>
              </div>
              <div className="jd-faq-body">
                {!previewDoc ? (
                  isDocsLoading ? (
                    <p className="jd-faq-loading">Loading documents...</p>
                  ) : docsList.length === 0 ? (
                    <p className="jd-faq-empty">No documents attached by this candidate.</p>
                  ) : (
                    docsList.map((doc) => (
                      <div
                        key={doc.id}
                        className="jd-faq-item"
                        style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0d2f4f" }}>
                          {doc.file_name}
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="solid-btn"
                            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={() => setPreviewDoc({ file_name: doc.file_name, url: doc.url || `/api/applicants/${candUserId}/resume` })}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
                    <iframe
                      src={previewDoc.url}
                      style={{ width: "100%", height: "420px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      title={previewDoc.file_name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="cand-details-footer" style={{ justifyContent: "flex-end", gap: "10px" }}>
            {customFooterActions}
            <button
              type="button"
              className="cand-details-cancel-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
