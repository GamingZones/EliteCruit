/**
 * EliteCruit Client-Side Protection Module
 * 
 * Protects the frontend from casual inspection and tampering:
 * 1. Allows normal right-click for text copying, pasting, and selection.
 * 2. Blocks developer keyboard shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S.
 * 3. Anti-DevTools Debugger Trap: When DevTools is opened, an obfuscated debugger loop triggers,
 *    pausing and locking the DevTools Sources panel.
 * 4. Includes an opt-in bypass (?devtools_access=allowed or localStorage 'elitecruit_debug_allowed') for developer maintenance.
 */

export function initClientSecurity() {
  if (typeof window === "undefined") return;

  // Developer escape hatch for authorized debugging
  try {
    if (
      localStorage.getItem("elitecruit_debug_allowed") === "true" ||
      window.location.search.includes("devtools_access=allowed")
    ) {
      return;
    }
  } catch {}

  // 1. Disable Developer Shortcut Keys
  window.addEventListener(
    "keydown",
    (event) => {
      // F12
      if (event.key === "F12" || event.keyCode === 123) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // Ctrl + Shift + I (Inspect)
      // Ctrl + Shift + J (Console)
      // Ctrl + Shift + C (Element picker)
      if (
        isCtrlOrCmd &&
        event.shiftKey &&
        (event.key === "I" ||
          event.key === "i" ||
          event.key === "J" ||
          event.key === "j" ||
          event.key === "C" ||
          event.key === "c")
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Ctrl + U (View Source)
      if (isCtrlOrCmd && (event.key === "U" || event.key === "u")) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Ctrl + S (Save Page)
      if (isCtrlOrCmd && (event.key === "S" || event.key === "s")) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    },
    true
  );

  // 2. Anti-DevTools Debugger Trap (TEMPORARILY DISABLED by user request)
  // const triggerTrap = () => {
  //   try {
  //     (function () {
  //       return false;
  //     }
  //       ["constructor"]("debugger")
  //       ["call"]());
  //   } catch {}
  // };
  // setInterval(triggerTrap, 800);
}
