import React from "react";
import "./Start.css";

type Feature = {
  title: string;
  desc: string;
  iconPath: string;
};

const features: Feature[] = [
  {
    title: "Smart Matching",
    desc: "Compare applicant profiles with job requirements using transparent scoring.",
    iconPath: "/logos/smart-matching.svg",
  },
  {
    title: "ATS Resume Validation",
    desc: "Help applicants prepare structured resumes before applying.",
    iconPath: "/logos/ats-resume-validation.svg",
  },
  {
    title: "Applicant Documents",
    desc: "Organize resumes, cover letters, portfolio links, and certificates.",
    iconPath: "/logos/applicant-documents.svg",
  },
  {
    title: "Nearby Applicant Finder",
    desc: "Let employers discover candidates near a hiring location.",
    iconPath: "/logos/nearby-applicant-finder.svg",
  },
  {
    title: "Recruitment Feedback",
    desc: "Route feedback through admin review before public summaries.",
    iconPath: "/logos/recruitment-feedback.svg",
  },
  {
    title: "Top-Rated Companies",
    desc: "Show company reputation from approved recruitment feedback.",
    iconPath: "/logos/top-rated-companies.svg",
  },
  {
    title: "Recruitment Analytics",
    desc: "Summarize application activity, shortlists, and job performance.",
    iconPath: "/logos/recruitment-analytics.svg",
  },
  {
    title: "Chatbot Support",
    desc: "Provide guided recruitment support from platform and company FAQs.",
    iconPath: "/logos/chatbot-support.svg",
  },
];

export default function StartPage() {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero-overlay" />

        <div className="hero-bg-container" aria-hidden="true">
          <div className="bg-panel top" />
          <div className="bg-panel center" />
          <div className="bg-panel bottom" />
        </div>

        <div className="hero-content">
          <nav className="topbar">
            <div className="brand">
              <span className="brand-main">EliteCruit</span>
              <span className="brand-sub">Recruitment Platform</span>
            </div>

            <div className="top-actions">
              <a className="btn btn-ghost" href="/login">
                Login
              </a>
              <a className="btn btn-primary" href="/create-account">
                Create Account
              </a>
            </div>
          </nav>

          <div className="hero-copy">
            <span className="badge">Modern ATS workflow for recruitment teams</span>
            <h1>Manage hiring from profile readiness to candidate discovery.</h1>
            <p>
              EliteCruit helps applicants prepare stronger applications while giving
              employers practical tools for job posting, filtering, shortlisting,
              feedback review, and recruitment analytics.
            </p>
          </div>
        </div>
      </header>

      <main className="features-wrap">
        <section className="features-grid" aria-label="Platform Features">
          {features.map((feature) => {
            return (
              <article key={feature.title} className="feature-card">
                <span className="card-icon" aria-hidden="true">
                  <img src={feature.iconPath} alt="" loading="lazy" />
                </span>
                <h2>{feature.title}</h2>
                <p>{feature.desc}</p>
              </article>
            );
          })}
        </section>
      </main>

      <footer className="site-footer" aria-label="Footer information section" />
    </div>
  );
}
