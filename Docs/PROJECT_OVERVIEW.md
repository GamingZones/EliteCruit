# EliteCruit - Project Architecture & Hand-off Guide

**Document Purpose:** Quick-reference overview of the EliteCruit project structure, architecture, user roles, data flows, core rules, and current feature status for AI assistant sessions and developers.

---

## ⚠️ Core Project Development Rules (`+ Rule.txt`)

All development work in EliteCruit must strictly adhere to the project rules in `+ Rule.txt`:

1. **Independent Pages (Code & CSS):** All pages must be independent in code and design. Do not cross-import CSS or styles between sibling pages; copy and isolate styles into the page's dedicated design file.
2. **Allowed Shared Imports:** Only Sidebars, Header (including Chatbot Drawers), and filter components are allowed as shared imports across pages.
3. **Module Folder Separation:** Keep pages strictly organized in their designated module folder (`Frontend/src/pages/Admin/`, `Frontend/src/pages/Applicant/`, `Frontend/src/pages/Employer/`).
4. **No Implementation Plans:** Execute/implement actionable coding requests immediately without creating plan documents or waiting for approval.
5. **Differentiate Questions vs. Actions:** For general questions or inquiries ("is X there?", "does Y exist?"), inspect and report findings without editing code until given explicit instructions.
6. **Popup Message Modal Specification:**
   * Centered modal card over a dark semi-transparent blurred backdrop.
   * Circular soft yellow/amber badge (`#fef9c3`) with a warning triangle icon centered at top.
   * Centered bold navy title ("Warning") and body text.
   * Solid navy blue "OK" button (`#103f65` / `#00385e`), rounded corners, white text.
   * Must **NOT** auto-dismiss; stays open until user clicks "OK".
7. **Command Execution Control:** Do **NOT** run build commands (`npm run build`), `git status`, or terminal verification commands automatically after edits unless explicitly asked by the user.

---

## 1. Project Summary & Tech Stack

**EliteCruit** is a smart recruitment and job-matching platform tailored for local recruitment (specifically Cavite and surrounding regions in the Philippines). It connects Jobseekers (Applicants), Employers, and System Administrators.

* **Frontend:** React (TypeScript) + Vite, TailwindCSS / Custom CSS, Lucide React icons, Leaflet (interactive maps for location & talent finder), HTML5 File API (in-browser PDF/Word document previewer).
* **Backend:** Node.js + Express.js API server (`Backend/server.js`, port `5400`). Features Multer & Mammoth for document parsing, PDFKit for document streaming, Bcryptjs for authentication security, and `pg` pool for PostgreSQL connection.
* **Database:** PostgreSQL (`elitecruit` database at `localhost:5432`). Schema and seed scripts stored in `Database/`.
* **State & Auth:** JWT tokens + `localStorage` (`elitecruit-user`) for persistent client-side session management.

---

## 2. Directory Structure & Key Components

```
EliteCruit/
├── + Rule.txt                         # Strict development rules & popup specs
├── Backend/
│   ├── server.js                      # Express API server (routes, auth, DB queries)
│   ├── package.json                   # Backend dependencies
│   ├── API-one-by-one-checklist.md    # API progress & endpoint status list
│   └── README.md
├── Database/
│   ├── elitecruit-schema.sql          # PostgreSQL database schema DDL
│   ├── create_account_db.sql          # User & auth table schemas
│   ├── seed-current-data.sql          # Initial seed dataset
│   └── seed-extended-data.sql         # Expanded seed data for testing
├── Frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main router & page routes
│   │   ├── main.tsx                   # Entry point
│   │   ├── components/                # Shared UI (Sidebars, Chatbot Drawers, Modals)
│   │   ├── data/                      # Cavite map data & constants
│   │   └── pages/
│   │       ├── Admin/                 # Admin management & reporting
│   │       ├── Applicant/             # Applicant Dashboard, Profile, Job Search, Feedback
│   │       ├── Auth/                  # Landing (Start), Login, Create-Account
│   │       ├── Common/                # Messages, Notifications
│   │       └── Employer/              # Employer Dashboard, Job Posts, Applicant Finder, FAQs
│   ├── package.json                   # Frontend dependencies & scripts
│   └── index.html
├── DATA_FLOW_BY_PAGE.txt              # Exhaustive page-by-page Data In / Data Out spec
├── On_HOLD.txt                         # Backlog of features currently on hold
└── PROJECT_OVERVIEW.md                # Hand-off summary & project blueprint
```

---

## 3. Core Roles & Key Pages Breakdown

### 3.1. Authentication & Public Pages
* **Landing Page (`/` - `Start.tsx`):** Portal entry point with role cards (Applicant vs. Employer).
* **Login (`/login` - `Login.tsx`):** Role-based login (Applicant / Employer), returns JWT token + user details stored in `localStorage` under `elitecruit-user`.
* **Account Creation (`/create-account` - `Create-Account.tsx`):** Signup with validation meter for password strength (8+ chars, uppercase, digit).

### 3.2. Applicant Workspace
* **Dashboard (`/applicant-dashboard` - `Applicant-Dashboard.tsx`):** High-level overview, Smart Match job recommendations with algorithmic match score, status of submitted applications, direct job invitations.
* **Job Search & Application (`/job-search` - `JobSearch.tsx`):** Multi-filter search (keyword, job function, work arrangement, distance radius), detailed description panel, instant apply button, employer FAQ drawer.
* **Applicant Profile (`/my-profile` - `ApplicantProfile.tsx`):** 3-section tabbed layout:
  1. *Personal & Contact Info:* Name, phone, Cavite city dropdown, address.
  2. *Career Targets & Map:* Desired title, arrangement, expected salary, experience level, interactive Leaflet pinpoint map modal.
  3. *Competencies & Documents:* Skills, qualifications, certifications (capped at 5 items per category with experience dropdowns), PDF/Word resume upload and viewer.

### 3.3. Employer Workspace
* **Employer Dashboard (`/employer-dashboard` - `Employer-Dashboard.tsx`):** Summary metrics (Active Jobs, Applications, Shortlisted, To Review), active job listings cards, recent application feed.
* **Job Post Creator/Editor (`/employer-job-posts` - `Employer-JobPosts.tsx`):** Publish or update job posts, urgent hiring toggle (auto-calculates 7-day close date), application limit, salary range.
* **Job Posts List (`/employer-job-posts-list` - `Employer-JobPostsList.tsx`):** Overview of all active/closed listings with applicant counter badges and edit/delete actions.
* **Applicant Management (`/employer-applicant-management` - `Employer-ApplicantManagement.tsx`):** Manage incoming job applications, filter by status, perform bulk shortlisting/approval/denial, preview candidate profile & resume.
* **Candidate Screening (`/employer-applicant-screening` - `Employer-ApplicantScreening.tsx`):** Ranked candidates by match score with highlighted skill overlap (green for matched, gray for missing).
* **Talent Finder & Map (`/employer-applicant-finder` & `/employer-nearby-applicants`):** Interactive Leaflet map displaying candidate locations around employer's office (5km, 10km, 15km radius), direct recruitment invitation modal with custom messages.
* **Company Profile (`/employer-company-profile` - `Employer-CompanyProfile.tsx`):** Business details, industry, size, address, office location pin.
* **Company FAQ Management (`/employer-faq-management` - `Employer-FaqManagement.tsx`):** Create and toggle active FAQs shown to jobseekers during job application.

### 3.4. Common & Shared Modules
* **Messages (`/messages` - `Messages.tsx`):** Live thread view between jobseekers and employers, tab filters ("Applied" vs "Recruited"), slide-out detail drawer.
* **Notifications (`/notifications` - `Notifications.tsx`):** Real-time alerts for application updates, invitations, and messages with dynamic unread badges on sidebars.
* **Feedback & Ratings (`/feedback` - `Applicant-Feedback.tsx`):** Star ratings (1-5 stars) and review notes between applicants and employers.

---

## 4. Current Features On Hold (`On_HOLD.txt`)

The following items are deferred for future development phases:
1. **Swipe-Based Tinder-Like Browsing:** Interactive card swiping UI for jobs and candidates.
2. **Admin Hiring Trends Analytics & Reports:** Interactive charts & exportable administrative reports in Admin view.
3. **Advanced Employer Chatbot Response Rules:** Automated custom bot rules manager beyond standard FAQs.

---

## 5. Hand-off Quick Start for New AI Sessions

When starting a new conversation session, tell the assistant:
> *"I am working on the EliteCruit project. Please read `PROJECT_OVERVIEW.md`, `+ Rule.txt`, and `DATA_FLOW_BY_PAGE.txt` to align on the project structure, rules, and data flows."*

*Note for AI Assistants updating `PROJECT_OVERVIEW.md`: When asked by the user to "update the file for all updates made up to this point", **replace** Section 6 with ONLY the latest changes completed in your current conversation session (do not append old session logs).*

---

## 6. Recent Session Updates & Change Log

### 6.1. Standardized ATS Document Generator (`ApplicantProfile.tsx` & `.css`, `Backend/server.js`)
* **Header Action Button:** Added temporary button **`[TEMP] 📄 Create ATS Document`** to the Applicant Profile header topbar (`appdash-top-right`), enabling candidates to compile their profile data into a standardized ATS resume document.
* **Dual-View Modal Interface:**
  - **👁️ Visual ATS Preview:** Formatted in an **Executive 2-Column Standard** matching top ATS templates (*Logan Mitchell format*). Features a fixed uppercase left sidebar (`PROFILE`, `EXPERIENCE`, `EDUCATION`, `SKILLS`, `LANGUAGES`), clean 1px horizontal rule dividers (`border-bottom: 1px solid #94a3b8`), aligned date ranges with company titles, right-aligned locations, and a categorized skills matrix (`TECHNICAL:`, `TARGET ROLE:`, `PREFERENCES:`).
  - **📄 Plain Text (ATS Raw):** Displays 100% ATS parser-compatible raw text output inside a monospace code container for direct copy-pasting into job application forms.
* **Document Downloads & Attachment:** Enables 1-to-1 high-res PDF generation (`html2canvas` + `jsPDF`), instant `.txt` file export, and direct resume file attachment to the candidate's account (`processResumeUpload`).

### 6.2. Google Gemini AI API Engine (`server.js`, `@google/genai`)
* **AI Optimization Route (`POST /api/applicants/:userId/ats-document/optimize`):** Integrated Google Gemini API (`@google/genai` using model `gemini-3.5-flash-lite`) to automatically rewrite Professional Summaries with high-density industry keywords and format Work Experience responsibilities into high-impact action verb bullet points (*Engineered, Spearheaded, Architected, Optimized*).
* **Modal Trigger Button:** Added **`✨ Optimize with Gemini AI`** button in the ATS Modal header.
* **Timeout & Fallback Guarantees:** Switched to ultra-fast `gemini-3.5-flash-lite` with 6s backend and 8s frontend `AbortController` timeout safety guarantees to prevent endless loading states.

### 6.3. Backend REST API Endpoints (`Backend/server.js`)
* **ATS Document Endpoint (`GET /api/applicants/:userId/ats-document`):** Implemented backend REST route supporting `?format=json` (structured candidate data), `?format=txt` (plain text stream), and `?format=pdf` (server-side PDFKit generation).
* **Environment Configuration:** Configured `GEMINI_API_KEY` in `Backend/.env`.

### 6.4. Data Cleanliness & Formatting Fixes
* **Salary `₱NaN` Fix:** Updated expected salary coercion in `ApplicantProfile.tsx` by stripping non-numeric characters before `.toLocaleString()`, handling open text or salary ranges cleanly without `NaN` errors.
* **Location Formatting:** Fixed duplicate dollar sign bug (`$Metro Manila` -> `Metro Manila`).
* **Qualifications Formatting:** Cleaned qualification lists by splitting comma-separated strings and stripping bracketed metadata (e.g. `[BS IT]`) into individual bullet items.
