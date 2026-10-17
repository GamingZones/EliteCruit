// Simulation test for frontend route protection and 401 fallback logic

function createMockEnvironment(initialUrl = "/", storage = {}) {
  const store = { ...storage };
  const mockLocation = {
    pathname: initialUrl.split("?")[0],
    search: initialUrl.includes("?") ? "?" + initialUrl.split("?")[1] : "",
    href: `http://localhost:5173${initialUrl}`,
    replace(url) {
      this.pathname = url.split("?")[0];
      this.search = url.includes("?") ? "?" + url.split("?")[1] : "";
      this.href = `http://localhost:5173${url}`;
      this.replacedWith = url;
    },
  };

  const mockLocalStorage = {
    getItem(k) { return store[k] || null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { Object.keys(store).forEach((k) => delete store[k]); },
    _store: store,
  };

  return { mockLocation, mockLocalStorage };
}

function evaluateProtectedRoute({ element, allowedRoles }, location, localStorage) {
  const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token");
  const userRaw = localStorage.getItem("elitecruit-user");
  let user = null;
  try { user = userRaw ? JSON.parse(userRaw) : null; } catch {}

  // Fallback 1: Unauthenticated -> Redirect immediately to /login
  if (!token || !user) {
    location.replace("/login?auth=required");
    return null;
  }

  // Fallback 2: Role mismatch -> Redirect to user's proper dashboard
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      location.replace("/admin-dashboard");
    } else if (user.role === "employer") {
      location.replace("/employer-dashboard");
    } else {
      location.replace("/applicant-dashboard");
    }
    return null;
  }

  return element;
}

function evaluatePublicOnlyRoute({ element }, location, localStorage) {
  const token = localStorage.getItem("elitecruit-token") || localStorage.getItem("token");
  const userRaw = localStorage.getItem("elitecruit-user");
  let user = null;
  try { user = userRaw ? JSON.parse(userRaw) : null; } catch {}

  if (token && user) {
    if (user.role === "admin") {
      location.replace("/admin-dashboard");
    } else if (user.role === "employer") {
      location.replace("/employer-dashboard");
    } else {
      location.replace("/applicant-dashboard");
    }
    return null;
  }

  return element;
}

function evaluateFetch401(url, status, location, localStorage) {
  if (status === 401) {
    const isAuthAttempt = url.includes("/api/auth/login") || url.includes("/api/auth/register");
    if (!isAuthAttempt) {
      localStorage.removeItem("elitecruit-token");
      localStorage.removeItem("token");
      localStorage.removeItem("elitecruit-user");
      const currentPath = location.pathname.toLowerCase();
      if (currentPath !== "/login" && currentPath !== "/" && currentPath !== "/create-account") {
        location.replace("/login?session=expired");
      }
    }
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("   FRONTEND REDIRECTION & 401 FALLBACK TESTS              ");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // TEST 1: Unauthenticated user visits /employer-job-posts/create
  const env1 = createMockEnvironment("/employer-job-posts/create", {});
  const res1 = evaluateProtectedRoute(
    { element: "JobPostsForm", allowedRoles: ["employer", "admin"] },
    env1.mockLocation,
    env1.mockLocalStorage
  );
  assert(
    "Unauthenticated visiting protected route redirects to /login?auth=required",
    res1 === null && env1.mockLocation.replacedWith === "/login?auth=required",
    `Result: ${res1}, Replaced: ${env1.mockLocation.replacedWith}`
  );

  // TEST 2: Unauthenticated user visits /applicant-dashboard
  const env2 = createMockEnvironment("/applicant-dashboard", {});
  const res2 = evaluateProtectedRoute(
    { element: "ApplicantDashboard", allowedRoles: ["applicant", "admin"] },
    env2.mockLocation,
    env2.mockLocalStorage
  );
  assert(
    "Unauthenticated visiting /applicant-dashboard redirects to /login?auth=required",
    res2 === null && env2.mockLocation.replacedWith === "/login?auth=required"
  );

  // TEST 3: Unauthenticated user visits /admin-dashboard
  const env3 = createMockEnvironment("/admin-dashboard", {});
  const res3 = evaluateProtectedRoute(
    { element: "AdminDashboard", allowedRoles: ["admin"] },
    env3.mockLocation,
    env3.mockLocalStorage
  );
  assert(
    "Unauthenticated visiting /admin-dashboard redirects to /login?auth=required",
    res3 === null && env3.mockLocation.replacedWith === "/login?auth=required"
  );

  // TEST 4: Applicant user visits /employer-job-posts/create (Role Mismatch)
  const env4 = createMockEnvironment("/employer-job-posts/create", {
    "elitecruit-token": "valid.token",
    "elitecruit-user": JSON.stringify({ id: 10, role: "applicant" }),
  });
  const res4 = evaluateProtectedRoute(
    { element: "JobPostsForm", allowedRoles: ["employer", "admin"] },
    env4.mockLocation,
    env4.mockLocalStorage
  );
  assert(
    "Applicant visiting employer route redirects to /applicant-dashboard",
    res4 === null && env4.mockLocation.replacedWith === "/applicant-dashboard"
  );

  // TEST 5: Employer user visits /my-profile (Applicant route)
  const env5 = createMockEnvironment("/my-profile", {
    "elitecruit-token": "valid.token",
    "elitecruit-user": JSON.stringify({ id: 20, role: "employer" }),
  });
  const res5 = evaluateProtectedRoute(
    { element: "ApplicantProfile", allowedRoles: ["applicant", "admin"] },
    env5.mockLocation,
    env5.mockLocalStorage
  );
  assert(
    "Employer visiting applicant route redirects to /employer-dashboard",
    res5 === null && env5.mockLocation.replacedWith === "/employer-dashboard"
  );

  // TEST 6: Non-admin visits /admin-employers
  const env6 = createMockEnvironment("/admin-employers", {
    "elitecruit-token": "valid.token",
    "elitecruit-user": JSON.stringify({ id: 20, role: "employer" }),
  });
  const res6 = evaluateProtectedRoute(
    { element: "AdminEmployers", allowedRoles: ["admin"] },
    env6.mockLocation,
    env6.mockLocalStorage
  );
  assert(
    "Employer visiting admin route redirects to /employer-dashboard",
    res6 === null && env6.mockLocation.replacedWith === "/employer-dashboard"
  );

  // TEST 7: Authenticated user visits /login (PublicOnlyRoute)
  const env7 = createMockEnvironment("/login", {
    "elitecruit-token": "valid.token",
    "elitecruit-user": JSON.stringify({ id: 10, role: "applicant" }),
  });
  const res7 = evaluatePublicOnlyRoute(
    { element: "LoginForm" },
    env7.mockLocation,
    env7.mockLocalStorage
  );
  assert(
    "Logged-in user visiting /login redirects to their dashboard (/applicant-dashboard)",
    res7 === null && env7.mockLocation.replacedWith === "/applicant-dashboard"
  );

  // TEST 8: Authenticated user with matching role accessing protected route
  const env8 = createMockEnvironment("/employer-dashboard", {
    "elitecruit-token": "valid.token",
    "elitecruit-user": JSON.stringify({ id: 20, role: "employer" }),
  });
  const res8 = evaluateProtectedRoute(
    { element: "EmployerDashboard", allowedRoles: ["employer", "admin"] },
    env8.mockLocation,
    env8.mockLocalStorage
  );
  assert(
    "Authenticated employer accessing /employer-dashboard renders component (No redirect)",
    res8 === "EmployerDashboard" && !env8.mockLocation.replacedWith
  );

  // TEST 9: API returns 401 on protected endpoint while on /employer-dashboard
  const env9 = createMockEnvironment("/employer-dashboard", {
    "elitecruit-token": "expired.token",
    "elitecruit-user": JSON.stringify({ id: 20, role: "employer" }),
  });
  evaluateFetch401("/api/employers/20/applications", 401, env9.mockLocation, env9.mockLocalStorage);
  assert(
    "API 401 response clears tokens and redirects to /login?session=expired",
    env9.mockLocalStorage.getItem("elitecruit-token") === null &&
    env9.mockLocalStorage.getItem("elitecruit-user") === null &&
    env9.mockLocation.replacedWith === "/login?session=expired"
  );

  // TEST 10: API returns 401 on /api/auth/login (bad credentials)
  const env10 = createMockEnvironment("/login", {});
  evaluateFetch401("/api/auth/login", 401, env10.mockLocation, env10.mockLocalStorage);
  assert(
    "API 401 on /api/auth/login does NOT redirect (prevents redirect loop on login page)",
    !env10.mockLocation.replacedWith
  );

  console.log("\n==========================================================");
  console.log(`FALLBACK TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
