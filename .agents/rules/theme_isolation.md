# Strict Theme Isolation (Light Mode vs. Dark Mode)

1. **Targeted Theme Edits Only**:
   - Whenever adjusting, styling, or fixing a theme (Light Mode or Dark Mode), ensure ONLY the targeted theme is affected.
   - Adjusting Light Mode must never alter, break, or degrade Dark Mode.
   - Adjusting Dark Mode must never alter, break, or degrade Light Mode.

2. **Separation of Concerns**:
   - If a code or CSS edit could affect both themes, strictly separate them:
     - **NEVER** hardcode theme-specific inline styles (e.g., hardcoded light text `#f8fafc` or dark backgrounds) directly in JSX where they leak across both modes.
     - Keep default / light mode styles in the component's base stylesheet.
     - Isolate dark mode styles under `[data-theme="dark"]` in the dark theme stylesheet (or use scoped CSS variables).
     - Ensure any change made to one theme leaves the other theme 100% intact, fully legible, and unaffected.
