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
import EmployerNoticesFaqs from "./pages/Employer/Employer-NoticesFaqs";
import EmployerApplicantFinder from "./pages/Employer/Employer-ApplicantFinder";
import ApplicantFeedback from "./pages/Applicant/Applicant-Feedback";
import AdminDashboard from "./pages/Admin/Admin-Dashboard";
import AdminApplicantManagement from "./pages/Admin/Admin-ApplicantManagement";
import AdminEmployerManagement from "./pages/Admin/Admin-EmployerManagement";
import AdminApplicantAnalytics from "./pages/Admin/Admin-ApplicantAnalytics";
import AdminEmployerAnalytics from "./pages/Admin/Admin-EmployerAnalytics";
import { getAuthToken, getStoredUser } from "./utils/auth";

type Role = "applicant" | "employer" | "admin";

function ProtectedRoute({
  element,
  allowedRoles,
}: {
  element: React.ReactElement;
  allowedRoles?: Role[];
}) {
  const token = getAuthToken();
  const user = getStoredUser<{ id: number; role: Role; email: string }>();

  // Fallback 1: Unauthenticated -> Redirect immediately to /login
  if (!token || !user) {
    if (typeof window !== "undefined") {
      window.location.replace("/login?auth=required");
    }
    return null;
  }

  // Fallback 2: Role mismatch -> Redirect to user's proper dashboard
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (typeof window !== "undefined") {
      if (user.role === "admin") {
        window.location.replace("/admin-dashboard");
      } else if (user.role === "employer") {
        window.location.replace("/employer-dashboard");
      } else {
        window.location.replace("/applicant-dashboard");
      }
    }
    return null;
  }

  return element;
}

function PublicOnlyRoute({ element }: { element: React.ReactElement }) {
  const token = getAuthToken();
  const user = getStoredUser<{ id: number; role: Role; email: string }>();

  // If already authenticated and navigating to login/register, smoothly redirect to dashboard
  if (token && user) {
    if (typeof window !== "undefined") {
      if (user.role === "admin") {
        window.location.replace("/admin-dashboard");
      } else if (user.role === "employer") {
        window.location.replace("/employer-dashboard");
      } else {
        window.location.replace("/applicant-dashboard");
      }
    }
    return null;
  }

  return element;
}

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "/";

  // Admin routes
  if (path === "/admin-dashboard" || path === "/admin/dashboard" || path === "/admin") {
    return <ProtectedRoute element={<AdminDashboard />} allowedRoles={["admin"]} />;
  }
  if (path === "/admin-applicants" || path === "/admin/applicants") {
    return <ProtectedRoute element={<AdminApplicantManagement />} allowedRoles={["admin"]} />;
  }
  if (path === "/admin-applicant-analytics" || path === "/admin/applicant-analytics") {
    return <ProtectedRoute element={<AdminApplicantAnalytics />} allowedRoles={["admin"]} />;
  }
  if (path === "/admin-employers" || path === "/admin/employers") {
    return <ProtectedRoute element={<AdminEmployerManagement />} allowedRoles={["admin"]} />;
  }
  if (path === "/admin-employer-analytics" || path === "/admin/employer-analytics") {
    return <ProtectedRoute element={<AdminEmployerAnalytics />} allowedRoles={["admin"]} />;
  }

  // Auth routes
  if (path === "/login") {
    return <PublicOnlyRoute element={<Login />} />;
  }
  if (path === "/create-account") {
    return <PublicOnlyRoute element={<CreateAccount />} />;
  }

  // Applicant routes
  if (path === "/applicant-dashboard" || path === "/applicant/dashboard") {
    return <ProtectedRoute element={<ApplicantDashboard />} allowedRoles={["applicant", "admin"]} />;
  }
  if (path === "/job-search") {
    return <ProtectedRoute element={<JobSearch />} allowedRoles={["applicant", "admin"]} />;
  }
  if (path === "/my-profile" || path === "/applicant-profile") {
    return <ProtectedRoute element={<ApplicantProfile />} allowedRoles={["applicant", "admin"]} />;
  }
  if (path === "/feedback" || path === "/applicant-feedback") {
    return <ProtectedRoute element={<ApplicantFeedback />} allowedRoles={["applicant", "employer", "admin"]} />;
  }

  // Employer routes
  if (path === "/employer-dashboard" || path === "/employer/dashboard") {
    return <ProtectedRoute element={<EmployerDashboard />} allowedRoles={["employer", "admin"]} />;
  }
  if (path === "/employer-job-posts" || path === "/employer/job-posts") {
    return <ProtectedRoute element={<EmployerJobPostsList />} allowedRoles={["employer", "admin"]} />;
  }
  if (path === "/employer-job-posts/create" || path === "/employer/job-posts/create") {
    return <ProtectedRoute element={<EmployerJobPosts />} allowedRoles={["employer", "admin"]} />;
  }
  if (
    path === "/employer-applicant-management" ||
    path === "/employer/applicant-management" ||
    path === "/employer-applicant-screening" ||
    path === "/employer/applicant-screening"
  ) {
    return <ProtectedRoute element={<EmployerApplicantManagement />} allowedRoles={["employer", "admin"]} />;
  }
  if (
    path === "/employer-applicant-finder" ||
    path === "/employer/applicant-finder" ||
    path === "/employer-nearby-applicants" ||
    path === "/employer/nearby-applicants"
  ) {
    return <ProtectedRoute element={<EmployerApplicantFinder />} allowedRoles={["employer", "admin"]} />;
  }
  if (
    path === "/employer-notices-faqs" ||
    path === "/employer/notices-faqs" ||
    path === "/employer-faq-management" ||
    path === "/employer/faq-management"
  ) {
    return <ProtectedRoute element={<EmployerNoticesFaqs />} allowedRoles={["employer", "admin"]} />;
  }
  if (path === "/employer-company-profile" || path === "/employer/company-profile") {
    return <ProtectedRoute element={<EmployerCompanyProfile />} allowedRoles={["employer", "admin"]} />;
  }

  // Common authenticated routes
  if (path === "/messages") {
    return <ProtectedRoute element={<Messages />} allowedRoles={["applicant", "employer", "admin"]} />;
  }
  if (path === "/notifications") {
    return <ProtectedRoute element={<Notifications />} allowedRoles={["applicant", "employer", "admin"]} />;
  }

  // Landing page
  return <Start />;
}
