import React from "react";
import Start from "./pages/Auth/Start";
import Login from "./pages/Auth/Login";
import CreateAccount from "./pages/Auth/Create-Account";
import ApplicantDashboard from "./pages/Applicant/Applicant-Dashboard";
import ApplicantProfile from "./pages/Applicant/ApplicantProfile";
import JobSearch from "./pages/Applicant/JobSearch";
import Messages from "./pages/Common/Messages";
import Notifications from "./pages/Common/Notifications";
import EmployerDashboard from "./pages/Employer/Employer-Dashboard";
import EmployerJobPosts from "./pages/Employer/Employer-JobPosts";
import EmployerJobPostsList from "./pages/Employer/Employer-JobPostsList";
import EmployerApplicantManagement from "./pages/Employer/Employer-ApplicantManagement";
import EmployerCompanyProfile from "./pages/Employer/Employer-CompanyProfile";
import EmployerFaqManagement from "./pages/Employer/Employer-FaqManagement";
import EmployerNearbyApplicants from "./pages/Employer/Employer-NearbyApplicants";
import ApplicantFeedback from "./pages/Applicant/Applicant-Feedback";
import AdminDashboard from "./pages/Admin/Admin-Dashboard";
import AdminApplicantManagement from "./pages/Admin/Admin-ApplicantManagement";
import AdminEmployerManagement from "./pages/Admin/Admin-EmployerManagement";

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/";

  if (path === "/admin-dashboard" || path === "/admin/dashboard" || path === "/admin") {
    return <AdminDashboard />;
  }
  if (path === "/admin-applicants" || path === "/admin/applicants") {
    return <AdminApplicantManagement />;
  }
  if (path === "/admin-employers" || path === "/admin/employers") {
    return <AdminEmployerManagement />;
  }
  if (path === "/login") {
    return <Login />;
  }
  if (path === "/create-account") {
    return <CreateAccount />;
  }
  if (path === "/applicant-dashboard" || path === "/applicant/dashboard") {
    return <ApplicantDashboard />;
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
