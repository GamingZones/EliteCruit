import React from "react";
import Start from "./pages/Start";
import Login from "./pages/Login";
import CreateAccount from "./pages/Create-Account";
import ApplicantDashboard from "./pages/Applicant-Dashboard";
import ApplicantProfile from "./pages/ApplicantProfile";
import JobSearch from "./pages/JobSearch";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import EmployerDashboard from "./pages/Employer-Dashboard";
import EmployerJobPosts from "./pages/Employer-JobPosts";
import EmployerJobPostsList from "./pages/Employer-JobPostsList";
import EmployerApplicantManagement from "./pages/Employer-ApplicantManagement";
import EmployerCompanyProfile from "./pages/Employer-CompanyProfile";
import EmployerFaqManagement from "./pages/Employer-FaqManagement";
import EmployerNearbyApplicants from "./pages/Employer-NearbyApplicants";
import ApplicantFeedback from "./pages/Applicant-Feedback";
import ApplicantDocumentConverter from "./pages/Applicant-DocumentConverter";

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/";

  if (path === "/login") {
    return <Login />;
  }
  if (path === "/create-account") {
    return <CreateAccount />;
  }
  if (path === "/applicant-dashboard" || path === "/applicant/dashboard") {
    return <ApplicantDashboard />;
  }
  if (path === "/applicant-document-converter" || path === "/applicant/document-converter") {
    return <ApplicantDocumentConverter />;
  }
  if (path === "/job-search") {
    return <JobSearch />;
  }
  if (path === "/employer-dashboard" || path === "/employer/dashboard") {
    return <EmployerDashboard />;
  }
  if (path === "/employer-job-posts" || path === "/employer/job-posts") {
    return <EmployerJobPostsList />;
  }
  if (path === "/employer-job-posts/create" || path === "/employer/job-posts/create") {
    return <EmployerJobPosts />;
  }
  if (
    path === "/employer-applicant-management" ||
    path === "/employer/applicant-management" ||
    path === "/employer-applicant-screening" ||
    path === "/employer/applicant-screening"
  ) {
    return <EmployerApplicantManagement />;
  }
  if (
    path === "/employer-applicant-finder" ||
    path === "/employer/applicant-finder" ||
    path === "/employer-nearby-applicants" ||
    path === "/employer/nearby-applicants"
  ) {
    return <EmployerNearbyApplicants />;
  }
  if (path === "/employer-faq-management" || path === "/employer/faq-management") {
    return <EmployerFaqManagement />;
  }
  if (path === "/employer-company-profile" || path === "/employer/company-profile") {
    return <EmployerCompanyProfile />;
  }
  if (path === "/messages") {
    return <Messages />;
  }
  if (path === "/notifications") {
    return <Notifications />;
  }
  if (path === "/feedback" || path === "/applicant-feedback") {
    return <ApplicantFeedback />;
  }
  if (path === "/my-profile" || path === "/applicant-profile") {
    return <ApplicantProfile />;
  }

  return <Start />;
}
