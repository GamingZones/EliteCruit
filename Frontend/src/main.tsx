import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import { initClientSecurity } from "./utils/security";

// Initialize client-side inspection protection (block right-click/F12 + anti-debugger trap)
initClientSecurity();

// Bootstrap theme preference early to prevent layout/color flickering
if (typeof window !== "undefined") {
  try {
    const applyGlobalTheme = () => {
      const savedTheme = localStorage.getItem("elitecruit-theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (savedTheme === "dark" || (savedTheme === "system" && prefersDark)) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    applyGlobalTheme();

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        const currentSaved = localStorage.getItem("elitecruit-theme");
        if (currentSaved === "system") {
          applyGlobalTheme();
        }
      });
    }

    window.addEventListener("storage", (e) => {
      if (e.key === "elitecruit-theme") {
        applyGlobalTheme();
      }
    });

    window.addEventListener("elitecruit-theme-change", applyGlobalTheme);
  } catch {}
}

// Install transparent authentication & 401 fallback interceptor for all API requests
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token");
      if (token) {
        const headers = new Headers(init?.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
    } catch {}

    const response = await originalFetch.call(this, input, init);

    // Automatic fallback: If 401 Unauthorized received, clear invalid auth and redirect to /login
    if (response.status === 401) {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      const isAuthAttempt = url.includes("/api/auth/login") || url.includes("/api/auth/register");
      if (!isAuthAttempt) {
        localStorage.removeItem("elitecruit-token");
        localStorage.removeItem("token");
        localStorage.removeItem("elitecruit-user");
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== "/login" && currentPath !== "/" && currentPath !== "/create-account") {
          window.location.replace("/login?session=expired");
        }
      }
    }

    return response;
  };
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
