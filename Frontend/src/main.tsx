import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";

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
