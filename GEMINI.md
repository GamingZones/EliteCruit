# Project Guidelines & Rules

## 1. Page Independence
- All pages must be independent in code and design.
- If a page is importing a design from another page's design file, copy the relevant styles into the respective design file of that page for independence.

## 2. Shared File Boundaries
- Sidebars, headers (including chatbot), and filters are the only shared files outside of utility functions to be connected on pages.
- Create these as individual files and import them into specific pages.

## 3. Directory Separation by Modules
- Separate by folders the 3 modules for this project (`Admin`, `Applicant`, and `Employer`).
- Any page (new or existing) specified for a module must reside in that module's folder.

## 4. Execution Over Planning
- Do not create implementation plans when requested to do work; execute and implement immediately without asking for approval on plans.

## 5. Differentiate Inquiries from Actionable Tasks
- When the user asks a general question or inquiry (e.g., "is X there?", "does Y exist?", "where is Z?"), DO NOT make code edits or modifications immediately.
- Inspect the codebase/data, report findings clearly, and wait for explicit instructions before taking action.

## 6. Popup Message Modal Design & Behavior (Popup Messages Only)
- Whenever requested to create a popup message/modal (warnings, alerts), strictly follow this design:
  - **Backdrop**: Centered modal card over a dark semi-transparent blurred backdrop overlay.
  - **Icon Badge**: Circular soft yellow/amber background badge (`#fef9c3`) with a warning triangle icon centered at the top.
  - **Title**: Centered bold navy title ("Warning").
  - **Body Message**: Centered body message text (e.g., "Main branch cannot be removed.").
  - **Action Button**: Centered solid navy blue "OK" button (`#103f65` / `#00385e`), rounded corners, white bold text.
  - **Persistence**: Popup messages must NOT auto-dismiss after a few seconds; they MUST remain open until the user manually clicks "OK" or closes the modal.
  - **Scope**: Applies strictly to popup modals; standard inline page top messages/banners remain separate.

## 7. Automated Commit & Push on Completion
- Always commit and push changes (`git add`, `git commit`, and `git push origin main`) automatically after completing requested tasks so that Render and production deploy the updates immediately without waiting for the user to prompt for a push.
- Do NOT run slow local build commands (e.g. `cmd /c npm run build`) automatically after edits unless explicitly requested by the user.

## 8. File Content & Change Inspection
- When checking file contents or inspecting file modifications, use 1 command prompt instead of fragmenting it across multiple commands/prompts to check the contents of the file changes.

## 9. Strict Theme Isolation (Light Mode vs. Dark Mode)
- Whenever adjusting, styling, or fixing a theme (Light Mode or Dark Mode), ensure ONLY the targeted theme is affected.
- If a code or CSS edit could affect both themes, strictly separate them:
  - **NEVER** hardcode theme-specific inline styles (e.g., hardcoded light text `#f8fafc` or dark backgrounds) directly in JSX where they leak across both modes.
  - Keep default/light mode styles in the component's base stylesheet and isolate dark mode styles under `[data-theme="dark"]` in the dark theme stylesheet (or use scoped CSS variables).
  - Ensure any change made to one theme leaves the other theme 100% intact, fully legible, and unaffected.

## 10. Shared Modal Isolation & Page-Specific Customizations
- When a shared modal (such as `ApplicantDetailsModal` or `JobDetailsModal`) is used across multiple pages or components (e.g., Applicant Management vs. Calendar Drawer):
  - **Never** hardcode page-specific workflow actions, decision buttons, or status mutations directly inside the shared modal component where they could alter or break other consuming pages.
  - Keep the shared modal as a clean, neutral base shell (header, tabs, layout) and inject page-specific elements exclusively via slot props (e.g., `customFooterActions`) or guarded variant props (`variant="management"`).
  - All page-specific buttons, callbacks, and handlers must be defined in the consuming parent page file (e.g., `Employer-ApplicantManagement.tsx`), ensuring other views (like `CalendarDrawer.tsx`) remain 100% unaffected and preserve their default behavior.

