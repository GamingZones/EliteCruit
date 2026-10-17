import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==========================================================");
console.log("   VERIFYING 10-ITEM LIST LIMITS & PAGINATION CONTROLS    ");
console.log("==========================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// 1. Verify Employer-JobPostsList.tsx
const jobPostsPath = path.join(rootDir, "Frontend", "src", "pages", "Employer", "Employer-JobPostsList.tsx");
const jobPostsContent = fs.readFileSync(jobPostsPath, "utf-8");

assert(jobPostsContent.includes("JOBS_PER_PAGE = 10"), "Job Posts list has JOBS_PER_PAGE set to 10");
assert(jobPostsContent.includes("paginatedJobs.map"), "Job Posts list maps over paginatedJobs");
assert(jobPostsContent.includes("totalPages > 1"), "Job Posts list renders pagination controls conditionally");
assert(jobPostsContent.includes("joblist-pagination"), "Job Posts list includes joblist-pagination bar");
assert(jobPostsContent.includes("window.scrollTo({ top: 0, behavior: \"smooth\" })"), "Job Posts pagination scrolls to top on page change");

// 2. Verify Employer-ApplicantFinder.tsx
const applicantFinderPath = path.join(rootDir, "Frontend", "src", "pages", "Employer", "Employer-ApplicantFinder.tsx");
const applicantFinderContent = fs.readFileSync(applicantFinderPath, "utf-8");

assert(applicantFinderContent.includes("CANDIDATES_PER_PAGE = 10"), "Applicant Finder has CANDIDATES_PER_PAGE set to 10");
assert(applicantFinderContent.includes("paginatedCandidates.map"), "Applicant Finder maps over paginatedCandidates");
assert(applicantFinderContent.includes("totalCandidatePages > 1"), "Applicant Finder renders pagination controls conditionally");
assert(applicantFinderContent.includes("finder-pagination-bar"), "Applicant Finder includes finder-pagination-bar");
assert(applicantFinderContent.includes("setCandidatePage(1)"), "Applicant Finder resets page to 1 when filters or search change");
assert(applicantFinderContent.includes("window.scrollTo({ top: 0, behavior: \"smooth\" })"), "Applicant Finder pagination scrolls to top on page change");

// 3. Verify JobSearch.tsx (Applicant Side)
const jobSearchPath = path.join(rootDir, "Frontend", "src", "pages", "Applicant", "JobSearch.tsx");
const jobSearchContent = fs.readFileSync(jobSearchPath, "utf-8");

assert(jobSearchContent.includes("JOBS_PER_PAGE = 10"), "Applicant Job Search has JOBS_PER_PAGE set to 10");
assert(jobSearchContent.includes("paginatedJobs.map"), "Applicant Job Search maps over paginatedJobs");
assert(jobSearchContent.includes("totalPages > 1"), "Applicant Job Search renders pagination controls conditionally");
assert(jobSearchContent.includes("jobsearch-pagination"), "Applicant Job Search includes jobsearch-pagination bar");
assert(jobSearchContent.includes("setCurrentPage(1)"), "Applicant Job Search resets page to 1 when filters or search change");
assert(jobSearchContent.includes("window.scrollTo({ top: 0, behavior: \"smooth\" })"), "Applicant Job Search pagination scrolls to top on page change");

// 4. Verify consistency with Employer-ApplicantManagement.tsx
const applicantMgmtPath = path.join(rootDir, "Frontend", "src", "pages", "Employer", "Employer-ApplicantManagement.tsx");
const applicantMgmtContent = fs.readFileSync(applicantMgmtPath, "utf-8");
assert(applicantMgmtContent.includes("APPLICANTS_PER_PAGE = 10"), "Applicant Management consistently limits to 10 per page");

console.log("==========================================================");
console.log(`PAGINATION LIMIT VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================================");

if (failed > 0) process.exit(1);
