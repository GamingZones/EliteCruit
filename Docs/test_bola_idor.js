const BASE_URL = "http://localhost:5400";

async function req(method, endpoint, data = null, token = null) {
  const headers = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runBolaTests() {
  console.log("==========================================================");
  console.log("   ELITECRUIT BOLA / IDOR COMPREHENSIVE SECURITY TESTS    ");
  console.log("==========================================================\n");

  const ts = Date.now();
  const pwd = "SecurePassword123!";

  let passed = 0;
  let failed = 0;

  function assertTest(name, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Setup accounts
  console.log("1. Provisioning Test Accounts...");
  const appA_reg = await req("POST", "/api/auth/register", {
    role: "applicant",
    email: `app_a_${ts}@test.local`,
    password: pwd,
    firstName: "Applicant",
    lastName: "Alpha",
    province: "Cavite",
    city: "Bacoor",
    agreeTerms: true,
  });
  const tokenAppA = appA_reg.data.token;
  const userAppA = appA_reg.data.user;

  const appB_reg = await req("POST", "/api/auth/register", {
    role: "applicant",
    email: `app_b_${ts}@test.local`,
    password: pwd,
    firstName: "Applicant",
    lastName: "Beta",
    province: "Cavite",
    city: "Imus",
    agreeTerms: true,
  });
  const tokenAppB = appB_reg.data.token;
  const userAppB = appB_reg.data.user;

  const emp1_reg = await req("POST", "/api/auth/register", {
    role: "employer",
    email: `emp_one_${ts}@test.local`,
    password: pwd,
    businessName: "Alpha Corp",
    province: "Cavite",
    city: "Dasmarinas",
    agreeTerms: true,
  });
  const tokenEmp1 = emp1_reg.data.token;
  const userEmp1 = emp1_reg.data.user;

  const emp2_reg = await req("POST", "/api/auth/register", {
    role: "employer",
    email: `emp_two_${ts}@test.local`,
    password: pwd,
    businessName: "Beta Corp",
    province: "Cavite",
    city: "General Trias",
    agreeTerms: true,
  });
  const tokenEmp2 = emp2_reg.data.token;
  const userEmp2 = emp2_reg.data.user;

  let tokenAdmin;
  const admin_login = await req("POST", "/api/auth/login", {
    email: "admin@elitecruit",
    password: "Admin123!",
    bypass2fa: true,
  });
  if (admin_login.data?.token) {
    tokenAdmin = admin_login.data.token;
  } else if (admin_login.data?.mfaRequired) {
    const v = await req("POST", "/api/auth/verify-2fa", {
      tempToken: admin_login.data.tempToken,
      code: admin_login.data.devCode,
    });
    tokenAdmin = v.data?.token;
  }

  console.log("Accounts ready. Beginning authorization tests...\n");

  // TEST 1: Unauthenticated request to applicant profile edit
  const t1 = await req("PUT", `/api/applicants/${userAppA.id}/profile`, { desired_job_title: "Hacked" });
  assertTest("Unauthenticated request returns 401 Unauthorized", t1.status === 401, `Status: ${t1.status}`);

  // TEST 2: Applicant A edits own profile (200 OK)
  const t2 = await req("PUT", `/api/applicants/${userAppA.id}/profile`, { desired_job_title: "Software Engineer" }, tokenAppA);
  assertTest("Applicant A can edit their own profile (200 OK)", t2.status === 200, `Status: ${t2.status}`);

  // TEST 3: Applicant A attempts to edit Applicant B's profile (403 Forbidden)
  const t3 = await req("PUT", `/api/applicants/${userAppB.id}/profile`, { desired_job_title: "Hacked by A" }, tokenAppA);
  assertTest("Applicant A cannot edit Applicant B's profile (403 Forbidden)", t3.status === 403, `Status: ${t3.status}`);

  // TEST 4: Applicant A attempts to update Applicant B's skills (403 Forbidden)
  const t4 = await req("PUT", `/api/applicants/${userAppB.id}/skills`, { skills: ["MaliciousSkill"] }, tokenAppA);
  assertTest("Applicant A cannot update Applicant B's skills (403 Forbidden)", t4.status === 403, `Status: ${t4.status}`);

  // TEST 5: Applicant A attempts to view Applicant B's applications list (403 Forbidden)
  const t5 = await req("GET", `/api/applicants/${userAppB.id}/applications`, null, tokenAppA);
  assertTest("Applicant A cannot view Applicant B's applications (403 Forbidden)", t5.status === 403, `Status: ${t5.status}`);

  // TEST 6: Applicant A attempts to view Applicant B's notifications (403 Forbidden)
  const t6 = await req("GET", `/api/users/${userAppB.id}/notifications`, null, tokenAppA);
  assertTest("Applicant A cannot view Applicant B's notifications (403 Forbidden)", t6.status === 403, `Status: ${t6.status}`);

  // TEST 7: Applicant A attempts to view Applicant B's unread messages count (403 Forbidden)
  const t7 = await req("GET", `/api/users/${userAppB.id}/unread-messages-count`, null, tokenAppA);
  assertTest("Applicant A cannot view Applicant B's unread messages count (403 Forbidden)", t7.status === 403, `Status: ${t7.status}`);

  // TEST 8: Applicant A attempts to view Applicant B's messages (403 Forbidden)
  const t8 = await req("GET", `/api/users/${userAppB.id}/messages`, null, tokenAppA);
  assertTest("Applicant A cannot view Applicant B's message inbox (403 Forbidden)", t8.status === 403, `Status: ${t8.status}`);

  // TEST 9: Employer 1 creates a Job Post
  const t9 = await req("POST", `/api/employers/${userEmp1.id}/job-posts`, {
    title: "Senior Node.js Developer",
    location: "Dasmarinas, Cavite",
    work_arrangement: "Hybrid",
    close_date: "12/31/2026",
    salary_min: 50000,
    salary_max: 80000,
    description: "Build secure scalable backend systems.",
  }, tokenEmp1);
  const job1Id = t9.data.jobPost?.id;
  assertTest("Employer 1 can create their own job post (201 Created)", t9.status === 201 && job1Id > 0, `Status: ${t9.status}`);

  // TEST 10: Employer 2 creates a Job Post
  const t10 = await req("POST", `/api/employers/${userEmp2.id}/job-posts`, {
    title: "Frontend React Developer",
    location: "General Trias, Cavite",
    work_arrangement: "On-Site",
    close_date: "12/31/2026",
    salary_min: 40000,
    salary_max: 60000,
    description: "Build modern accessible user interfaces.",
  }, tokenEmp2);
  const job2Id = t10.data.jobPost?.id;
  assertTest("Employer 2 can create their own job post (201 Created)", t10.status === 201 && job2Id > 0, `Status: ${t10.status}`);

  // TEST 11: Employer 2 attempts to update Employer 1's job post (403 Forbidden)
  const t11 = await req("PUT", `/api/employers/${userEmp1.id}/job-posts/${job1Id}`, {
    title: "Hacked Job Title",
    close_date: "12/31/2026",
  }, tokenEmp2);
  assertTest("Employer 2 cannot edit Employer 1's job post (403 Forbidden)", t11.status === 403, `Status: ${t11.status}`);

  // TEST 12: Employer 2 attempts to delete Employer 1's job post (403 Forbidden)
  const t12 = await req("DELETE", `/api/employers/${userEmp1.id}/job-posts/${job1Id}`, null, tokenEmp2);
  assertTest("Employer 2 cannot delete Employer 1's job post (403 Forbidden)", t12.status === 403, `Status: ${t12.status}`);

  // TEST 13: Employer 2 attempts to view Employer 1's applications list (403 Forbidden)
  const t13 = await req("GET", `/api/employers/${userEmp1.id}/applications`, null, tokenEmp2);
  assertTest("Employer 2 cannot view Employer 1's applicant list (403 Forbidden)", t13.status === 403, `Status: ${t13.status}`);

  // TEST 14: Employer 2 attempts to view Employer 1's dashboard summary (403 Forbidden)
  const t14 = await req("GET", `/api/employers/${userEmp1.id}/dashboard-summary`, null, tokenEmp2);
  assertTest("Employer 2 cannot view Employer 1's private dashboard stats (403 Forbidden)", t14.status === 403, `Status: ${t14.status}`);

  // TEST 15: Employer 2 attempts to view Employer 1's decision templates (403 Forbidden)
  const t15 = await req("GET", `/api/employers/${userEmp1.id}/decision-templates`, null, tokenEmp2);
  assertTest("Employer 2 cannot view Employer 1's decision templates (403 Forbidden)", t15.status === 403, `Status: ${t15.status}`);

  // TEST 16: Employer 2 attempts to update Employer 1's decision templates (403 Forbidden)
  const t16 = await req("PUT", `/api/employers/${userEmp1.id}/decision-templates`, {
    acceptance_template: "Tampered acceptance",
    rejection_template: "Tampered rejection",
  }, tokenEmp2);
  assertTest("Employer 2 cannot modify Employer 1's decision templates (403 Forbidden)", t16.status === 403, `Status: ${t16.status}`);

  // TEST 17: Employer 2 attempts to add a FAQ to Employer 1's profile (403 Forbidden)
  const t17 = await req("POST", `/api/employers/${userEmp1.id}/faqs`, {
    question: "Tampered Question?",
    answer: "Tampered Answer.",
    question_type: "general",
  }, tokenEmp2);
  assertTest("Employer 2 cannot post FAQs on Employer 1's behalf (403 Forbidden)", t17.status === 403, `Status: ${t17.status}`);

  // TEST 18: Applicant A applies to Job 1 (Employer 1's job)
  const t18 = await req("POST", `/api/applicants/${userAppA.id}/applications`, {
    job_post_id: job1Id,
  }, tokenAppA);
  const app1Id = t18.data.application?.id;
  assertTest("Applicant A can submit application to Job 1 (201 Created)", t18.status === 201 && app1Id > 0, `Status: ${t18.status}`);

  // TEST 19: Applicant A applies to Job 2 (Employer 2's job)
  const t19 = await req("POST", `/api/applicants/${userAppA.id}/applications`, {
    job_post_id: job2Id,
  }, tokenAppA);
  const app2Id = t19.data.application?.id;
  assertTest("Applicant A can submit application to Job 2 (201 Created)", t19.status === 201 && app2Id > 0, `Status: ${t19.status}`);

  // TEST 20: Employer 2 attempts to decide (approve/deny) Application 1 (which belongs to Employer 1) -> (403 Forbidden)
  const t20 = await req("PUT", `/api/applications/${app1Id}/status`, {
    status: "approved",
  }, tokenEmp2);
  assertTest("Employer 2 cannot decide an application for Employer 1's job (403 Forbidden)", t20.status === 403, `Status: ${t20.status}`);

  // TEST 21: Employer 2 attempts bulk-update on Application 1 (403 Forbidden)
  const t21 = await req("PUT", "/api/applications/bulk-status", {
    ids: [app1Id],
    status: "approved",
  }, tokenEmp2);
  assertTest("Employer 2 cannot bulk-update applications for Employer 1's job (403 Forbidden)", t21.status === 403, `Status: ${t21.status}`);

  // TEST 22: Employer 1 decides Application 1 (200 OK)
  const t22 = await req("PUT", `/api/applications/${app1Id}/status`, {
    status: "approved",
    message_type: "custom",
    message_text: "Welcome to Alpha Corp!",
  }, tokenEmp1);
  assertTest("Employer 1 CAN decide application for their own job post (200 OK)", t22.status === 200, `Status: ${t22.status}`);

  // TEST 23: Employer 1 attempts to invite candidate on Employer 2's behalf (403 Forbidden)
  const t23 = await req("POST", `/api/employers/${userEmp2.id}/invite-candidate`, {
    applicant_user_id: userAppB.id,
    job_post_id: job2Id,
    custom_message: "Spoofed invitation",
  }, tokenEmp1);
  assertTest("Employer 1 cannot invite candidates on Employer 2's behalf (403 Forbidden)", t23.status === 403, `Status: ${t23.status}`);

  // TEST 24: Applicant A creates a message thread with Employer 1
  const t24 = await req("POST", "/api/messages/threads", {
    created_by_user_id: userAppA.id,
    participant_user_ids: [userAppA.id, userEmp1.id],
    title: "Interview Inquiry",
    message_text: "Hi, following up on my application.",
  }, tokenAppA);
  const threadId = t24.data.thread?.id;
  assertTest("Applicant A can create conversation thread with Employer 1 (201 Created)", t24.status === 201 && threadId > 0, `Status: ${t24.status}`);

  // TEST 25: Applicant B attempts to view messages in Applicant A <-> Employer 1 thread (403 Forbidden)
  const t25 = await req("GET", `/api/messages/threads/${threadId}`, null, tokenAppB);
  assertTest("Applicant B cannot view private message thread between Applicant A & Employer 1 (403 Forbidden)", t25.status === 403, `Status: ${t25.status}`);

  // TEST 26: Applicant B attempts to post message to Applicant A <-> Employer 1 thread (403 Forbidden)
  const t26 = await req("POST", `/api/messages/threads/${threadId}/messages`, {
    sender_user_id: userAppB.id,
    message_text: "Intruding into your chat!",
  }, tokenAppB);
  assertTest("Applicant B cannot inject messages into another user's thread (403 Forbidden)", t26.status === 403, `Status: ${t26.status}`);

  // TEST 27: Applicant A CAN view their own message thread (200 OK)
  const t27 = await req("GET", `/api/messages/threads/${threadId}`, null, tokenAppA);
  assertTest("Applicant A CAN view their own message thread (200 OK)", t27.status === 200, `Status: ${t27.status}`);

  // TEST 28: Admin can access Employer 1's applications and job posts (200 OK)
  const t28 = await req("GET", `/api/employers/${userEmp1.id}/applications`, null, tokenAdmin);
  assertTest("Admin can access employer resources for platform oversight (200 OK)", t28.status === 200, `Status: ${t28.status}`);

  console.log("\n==========================================================");
  console.log(`BOLA / IDOR SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runBolaTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SCRIPT:", err);
  process.exit(1);
});
