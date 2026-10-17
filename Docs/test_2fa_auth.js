// Docs/test_2fa_auth.js
// Automated verification suite for Two-Factor Authentication (2FA) email flow

const API_BASE = "http://localhost:5400";

async function run2FATests() {
  console.log("=================================================");
  console.log("🧪 STARTING 2FA EMAIL AUTHENTICATION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? "(" + detail + ")" : ""}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? "- " + detail : ""}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.ok && healthData.ok, "Backend server health check", `status: ${healthRes.status}`);

    // 2. Reject incorrect credentials
    const badLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@elitecruit", password: "WrongPassword999!" }),
    });
    assert(badLoginRes.status === 401, "Reject invalid credentials", `status: ${badLoginRes.status}`);

    // 3. Initiate login with valid credentials (should require 2FA)
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@elitecruit", password: "Admin123!" }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, "Valid credentials accepted", `status: ${loginRes.status}`);
    assert(loginData.mfaRequired === true, "MFA required flag returned", `mfaRequired: ${loginData.mfaRequired}`);
    assert(Boolean(loginData.tempToken), "Temporary 2FA session token returned");
    assert(Boolean(loginData.maskedEmail), "Masked email returned", `maskedEmail: ${loginData.maskedEmail}`);
    assert(!loginData.token, "Full auth token NOT issued prior to 2FA verification");

    const tempToken = loginData.tempToken;
    const realCode = loginData.devCode;
    console.log(`\n  ℹ️ Intercepted dev 2FA code: ${realCode} for session token.\n`);

    // 4. Reject malformed / short code
    const shortCodeRes = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code: "123" }),
    });
    const shortCodeData = await shortCodeRes.json();
    assert(shortCodeRes.status === 400, "Reject short code format (<6 digits)", `status: ${shortCodeRes.status}, message: ${shortCodeData.message}`);

    // 5. Reject wrong 6-digit code with attempt countdown
    const wrongCodeRes = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code: "999999" }),
    });
    const wrongCodeData = await wrongCodeRes.json();
    assert(wrongCodeRes.status === 400, "Reject incorrect 6-digit code", `status: ${wrongCodeRes.status}, message: ${wrongCodeData.message}`);
    assert(wrongCodeData.message.includes("attempt"), "Error message contains remaining attempts count", wrongCodeData.message);

    // 6. Test resend rate-limiting (45 second cool-down)
    const rateLimitRes = await fetch(`${API_BASE}/api/auth/resend-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken }),
    });
    const rateLimitData = await rateLimitRes.json();
    assert(rateLimitRes.status === 429, "Enforce 45s resend rate limiting", `status: ${rateLimitRes.status}, retryAfter: ${rateLimitData.retryAfter}`);

    // 7. Verify correct 6-digit code & issue full JWT token
    const verifyRes = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code: realCode }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "Verify correct code successfully", `status: ${verifyRes.status}`);
    assert(Boolean(verifyData.token), "Issue full auth JWT token upon verification");
    assert(verifyData.user && verifyData.user.role === "admin", "User profile returned with role: admin");

    // 8. Reject code reuse (consumed OTP should be deleted from DB)
    const replayRes = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code: realCode }),
    });
    assert(replayRes.status === 400, "Reject reuse of consumed 2FA code", `status: ${replayRes.status}`);

    // 9. Verify authorized access to protected endpoint with issued JWT
    const protectedRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${verifyData.token}` },
    });
    const meData = await protectedRes.json();
    assert(protectedRes.status === 200 && meData.user, "Access protected resource with 2FA-issued token", `status: ${protectedRes.status}, user: ${meData.user?.email}`);

    // 10. Verify test bypass header compatibility (for test suites)
    const bypassRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bypass-2fa": "true",
      },
      body: JSON.stringify({ email: "admin@elitecruit", password: "Admin123!" }),
    });
    const bypassData = await bypassRes.json();
    assert(bypassRes.status === 200 && Boolean(bypassData.token), "Test bypass header allows direct token issuance for automated test suites");

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`📊 2FA TEST SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run2FATests();
