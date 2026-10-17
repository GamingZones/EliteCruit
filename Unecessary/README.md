# Unecessary Folder Archive

This folder stores deprecated, superseded, or irrelevant files that have been decoupled from the active EliteCruit system.

> [!NOTE]
> Per project guidelines, all code files in this directory have been completely commented out so they cannot execute or interfere with the application runtime. Any relevant functions or styles needed by other parts of the system have been extracted and migrated into dedicated, independent files.

---

## Catalog of Archived Files

### 1. `Employer-ApplicantScreening.tsx`
- **Original Location:** `Frontend/src/pages/Employer/Employer-ApplicantScreening.tsx`
- **Reason for Archiving:** Superseded by `Employer-ApplicantManagement.tsx`, which now handles candidate screening, shortlisting, approved candidates, and denied candidates all in one comprehensive module.
- **Transferred Code:** Direct invitation structures and screening stage workflows were already integrated into `Employer-ApplicantManagement.tsx`.
- **Status:** Entire page content commented out (`/* ... */ export {};`).

### 2. `Employer-ApplicantScreening.css`
- **Original Location:** `Frontend/src/pages/Employer/Employer-ApplicantScreening.css`
- **Reason for Archiving:** The old screening styles were previously imported cross-page by `Employer-ApplicantManagement.tsx` and `Employer-ApplicantFinder.tsx`.
- **Transferred Code:** All required screening styles (`.screening-main`, `.screening-card`, `.screening-hero`, `.tools-head`, `.tool-grid`, `.tool-item`, `.board-grid`, `.stage-wrap`, `.applicant-card`, `.applicant-top`, `.app-badge`) were transferred directly into `Employer-ApplicantManagement.css` to ensure complete styling independence (satisfying Rule 1).
- **Status:** Entire stylesheet content commented out (`/* ... */`).

### 3. `Employer-NearbyApplicants.tsx`
- **Original Location:** `Frontend/src/pages/Employer/Employer-NearbyApplicants.tsx`
- **Reason for Archiving:** Redundant 2-line re-export proxy (`export { default } from "./Employer-ApplicantFinder"`).
- **Transferred Code:** All routes (`/employer-applicant-finder`, `/employer/applicant-finder`, `/employer-nearby-applicants`, `/employer/nearby-applicants`) in `App.tsx` now directly route to `EmployerApplicantFinder.tsx`.
- **Status:** Entire file commented out (`/* ... */ export {};`).

### 4. `test-gemini.js`
- **Original Location:** `Backend/test-gemini.js`
- **Reason for Archiving:** One-off developer test script used during Gemini SDK exploration. It is not imported by `Backend/server.js` or used in production.
- **Status:** Entire script commented out (`/* ... */`).

### 5. `ATS-resume-template-executive-resume-3-1.docx`
- **Original Location:** `Import files/ATS-resume-template-executive-resume-3-1.docx`
- **Reason for Archiving:** Standalone sample Word document not used or referenced by any code.

### 6. `Node.js-README.md` & `Security-README.md`
- **Original Location:** `Node.js/README.md` and `Security/README.md`
- **Reason for Archiving:** Empty placeholder folders from initial project setup with no functional code.
- **Status:** Commented out inside markdown comment blocks (`<!-- ... -->`).

### 7. `caviteMapData.ts`
- **Original Location:** `Frontend/src/data/caviteMapData.ts`
- **Reason for Archiving:** Was hardcoded exclusively for Cavite locations, streets, and subdivisions.
- **Transferred Code:** Replaced by `Frontend/src/data/mapData.ts`, which generalizes geocoding and coordinates nationwide across all 82 Philippine provinces and key cities.
- **Status:** Entire file commented out (`/* ... */ export {};`).

---

## Newly Created Modular Components

- **`Frontend/src/components/Icons.tsx`:**
  - Created to extract `SideIcon`, `ChevronIcon`, and `SideNavItem` which were previously located inside `Applicant-Dashboard.tsx` and imported across 12 different pages in Employer, Common, and Applicant modules.
  - All pages now import their icons from this dedicated, independent component without coupling to `Applicant-Dashboard.tsx`.

- **`Frontend/src/data/mapData.ts`:**
  - Nationwide Philippine geocoding and GIS engine providing real `lat`/`lng` coordinates for all provinces and major cities across the Philippines, nationwide centroid fallbacks, and geographic badge initials without Cavite-only hardcoding.

