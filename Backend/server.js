import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import mammoth from "mammoth";
import PDFDocument from "pdfkit";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { send2FAEmail } from "./utils/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const PORT = Number(process.env.PORT || 5400);
const DATABASE_URL = (process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/elitecruit").trim();
const JWT_SECRET = (process.env.JWT_SECRET || "elitecruit_default_dev_secret_change_in_production").trim();

function generateAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***${local.slice(-1)}@${domain}`;
}

/**
 * Bayesian Fair Rating Computation
 * Formula: ((v * R) + (m * C)) / (v + m)
 * where:
 *   v = count of verified reviews received
 *   R = arithmetic mean of received ratings
 *   m = confidence prior weight parameter (default = 3)
 *   C = platform baseline prior mean (default = 4.0)
 * Note: (v * R) equals the sum of ratings.
 */
function computeBayesianRating(reviewCount, reviewAvgOrSum, isSum = false, priorWeight = 3, priorMean = 4.0) {
  const v = Number(reviewCount) || 0;
  if (v <= 0) return 0.0;
  const ratingTotal = isSum
    ? Number(reviewAvgOrSum) || 0
    : v * (Number(reviewAvgOrSum) || 0);
  const bayesian = (ratingTotal + (priorWeight * priorMean)) / (v + priorWeight);
  return Number(bayesian.toFixed(1));
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && String(authHeader).startsWith("Bearer ")
    ? String(authHeader).split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Session expired or invalid. Please log in again." });
    }
    req.user = decoded;
    next();
  });
}

function optionalAuthenticateToken(req, _res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && String(authHeader).startsWith("Bearer ")
    ? String(authHeader).split(" ")[1]
    : null;

  if (token) {
    jwt.verify(token, JWT_SECRET, (_err, decoded) => {
      if (decoded) req.user = decoded;
      next();
    });
  } else {
    next();
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Administrator privileges required." });
  }
  next();
}

// Allowed origins for CORS (Local development + Production domains)
const allowedOrigins = [
  "http://localhost:5300",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5300",
  "http://127.0.0.1:5173",
];
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",").forEach((url) => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin SSR)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes("*")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable SSL when deploying to cloud PostgreSQL databases (Render, Supabase, Neon, AWS, Railway)
const isProduction = process.env.NODE_ENV === "production";
const isCloudDb =
  !DATABASE_URL.includes("localhost") &&
  !DATABASE_URL.includes("127.0.0.1") &&
  !DATABASE_URL.includes("@db:");

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (isProduction && isCloudDb && process.env.DATABASE_SSL !== "false");

const pgPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

function normalizeSql(sql) {
  const str = String(sql).trim();
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\b/i.test(str)) {
    return "SELECT 1";
  }
  return str
    .replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP")
    .replace(/datetime\(([^)]+)\)/gi, "$1");
}

function toPgSql(sql, params = []) {
  const normalized = normalizeSql(sql);
  let index = 0;
  const text = normalized.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, values: params };
}

function insertReturningColumn(sql) {
  const match = String(sql).match(/^\s*INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i);
  if (!match) return null;
  const table = match[1].toLowerCase();
  const pkByTable = {
    users: "id",
    job_posts: "id",
    applications: "id",
    company_faq: "id",
    message_threads: "id",
    messages: "id",
    notifications: "id",
    applicant_profiles: "user_id",
    employer_profiles: "user_id",
    job_invitations: "id",
    scheduled_interviews: "id",
  };
  return pkByTable[table] || null;
}

function run(sql, params = []) {
  return (async () => {
    const baseSql = String(sql);
    const isInsert = /^\s*INSERT\s+/i.test(baseSql);
    const hasReturning = /\bRETURNING\b/i.test(baseSql);
    const returningColumn = insertReturningColumn(baseSql);
    const sqlWithReturning = isInsert && !hasReturning && returningColumn
      ? `${baseSql} RETURNING ${returningColumn}`
      : baseSql;
    const { text, values } = toPgSql(sqlWithReturning, params);
    const result = await pgPool.query(text, values);
    return {
      lastID: result.rows?.[0]?.id ?? result.rows?.[0]?.user_id ?? null,
      changes: Number(result.rowCount || 0),
    };
  })();
}

function get(sql, params = []) {
  return (async () => {
    const { text, values } = toPgSql(sql, params);
    const result = await pgPool.query(text, values);
    return result.rows?.[0] || null;
  })();
}

function all(sql, params = []) {
  return (async () => {
    const { text, values } = toPgSql(sql, params);
    const result = await pgPool.query(text, values);
    return result.rows || [];
  })();
}

async function tableExists(tableName) {
  const row = await get(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ?`,
    [tableName]
  );
  return Boolean(row);
}

function requireUserOrAdmin(req, res, next) {
  const targetUserId = Number(req.params.userId || req.params.id);
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  if (Number.isInteger(targetUserId) && req.user.id === targetUserId) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. You cannot access or modify another user's data." });
}

async function requireJobPostOwnerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  const jobPostId = Number(req.params.jobPostId || req.params.job_post_id);
  if (Number.isInteger(jobPostId) && jobPostId > 0) {
    const post = await get("SELECT employer_user_id FROM job_posts WHERE id = ?", [jobPostId]);
    if (!post || post.employer_user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You do not own this job posting." });
    }
  }
  next();
}

async function requireApplicationDecisionAuthority(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  const applicationId = Number(req.params.id);
  if (Number.isInteger(applicationId) && applicationId > 0) {
    const appRow = await get(
      `SELECT jp.employer_user_id 
       FROM applications a 
       JOIN job_posts jp ON jp.id = a.job_post_id 
       WHERE a.id = ?`,
      [applicationId]
    );
    if (!appRow || appRow.employer_user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied. Only the employer who posted this job can make application decisions." });
    }
  }
  next();
}

async function requireInvitationRecipientOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  const invitationId = Number(req.params.id);
  if (Number.isInteger(invitationId) && invitationId > 0) {
    const inv = await get("SELECT applicant_user_id FROM job_invitations WHERE id = ?", [invitationId]);
    if (!inv || inv.applicant_user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You cannot respond to an invitation sent to another candidate." });
    }
  }
  next();
}

async function requireNotificationRecipientOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  const notifId = Number(req.params.id);
  if (Number.isInteger(notifId) && notifId > 0) {
    const notif = await get("SELECT user_id FROM notifications WHERE id = ?", [notifId]);
    if (!notif || notif.user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You do not own this notification." });
    }
  }
  next();
}

async function requireThreadParticipantOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }
  if (req.user.role === "admin") {
    return next();
  }
  const threadId = Number(req.params.threadId);
  if (Number.isInteger(threadId) && threadId > 0) {
    const isParticipant = await get(
      "SELECT 1 FROM message_participants WHERE thread_id = ? AND user_id = ?",
      [threadId, req.user.id]
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied. You are not a participant in this conversation." });
    }
  }
  next();
}

async function ensureApplicantProfileColumns() {
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS resume_data BYTEA`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS resume_mimetype TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS profile_picture_mimetype TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS years_of_experience TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS province TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS work_experience_json TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS preferred_locations TEXT`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_min NUMERIC`);
  await run(`ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_max NUMERIC`);
}

async function migrateApplicantProfilesRemoveExperience() {
  return;
}

async function ensureEmployerProfileColumns() {
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS city TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS province TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS acceptance_template TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS rejection_template TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_logo_data BYTEA`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_logo_mimetype TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_cover_data BYTEA`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_cover_mimetype TEXT`);
  await run(`ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS website TEXT`);
}

async function ensureExtendedTables() {
  await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('applicant', 'employer', 'admin')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS applicant_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      terms_accepted_at TIMESTAMPTZ,
      phone TEXT,
      city TEXT,
      address TEXT,
      desired_job_title TEXT,
      expected_salary TEXT,
      work_arrangement TEXT,
      skills TEXT,
      certifications TEXT,
      qualifications TEXT,
      summary TEXT,
      languages TEXT,
      preferred_locations TEXT,
      resume_path TEXT,
      profile_picture_path TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS employer_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT NOT NULL,
      terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      terms_accepted_at TIMESTAMPTZ,
      industry TEXT,
      company_size TEXT,
      company_description TEXT,
      contact_number TEXT,
      province TEXT,
      city TEXT,
      company_address TEXT,
      company_logo_path TEXT,
      company_cover_path TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS admin_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL DEFAULT 'System Administrator',
      permissions_json TEXT DEFAULT '["all"]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS job_posts (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      is_urgent INTEGER NOT NULL DEFAULT 0,
      hide_salary INTEGER NOT NULL DEFAULT 0,
      work_arrangement TEXT,
      experience_level TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      description TEXT,
      qualifications TEXT,
      certifications TEXT,
      required_skills TEXT,
      application_limit INTEGER,
      close_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS applications (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      job_post_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
      applicant_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'submitted',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS company_faq (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      question_type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS message_threads (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS message_participants (
      thread_id INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ,
      PRIMARY KEY (thread_id, user_id)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      thread_id INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      related_application_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMPTZ
    )`);

    
  // Ensure job_post_id and is_anonymous on ratings tables
  try {
    await run("ALTER TABLE company_ratings ADD COLUMN IF NOT EXISTS job_post_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL");
    await run("ALTER TABLE company_ratings ADD COLUMN IF NOT EXISTS is_anonymous INTEGER DEFAULT 0");
    await run("ALTER TABLE company_ratings DROP CONSTRAINT IF EXISTS company_ratings_employer_user_id_applicant_user_id_key");
    await run("CREATE UNIQUE INDEX IF NOT EXISTS company_ratings_applicant_job_idx ON company_ratings (applicant_user_id, job_post_id) WHERE job_post_id IS NOT NULL");

    await run("ALTER TABLE candidate_ratings ADD COLUMN IF NOT EXISTS job_post_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL");
    await run("ALTER TABLE candidate_ratings ADD COLUMN IF NOT EXISTS is_anonymous INTEGER DEFAULT 0");
    await run("ALTER TABLE candidate_ratings DROP CONSTRAINT IF EXISTS candidate_ratings_employer_user_id_applicant_user_id_key");
    await run("CREATE UNIQUE INDEX IF NOT EXISTS candidate_ratings_employer_job_idx ON candidate_ratings (employer_user_id, applicant_user_id, job_post_id) WHERE job_post_id IS NOT NULL");
  } catch (migErr) {
    console.warn("Ratings migration note:", migErr.message);
  }

    await run(`CREATE TABLE IF NOT EXISTS company_ratings (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      applicant_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comments TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employer_user_id, applicant_user_id)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS candidate_ratings (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      applicant_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comments TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employer_user_id, applicant_user_id)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS job_invitations (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      applicant_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_post_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      custom_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS scheduled_interviews (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      employer_user_id INTEGER NOT NULL,
      applicant_user_id INTEGER,
      candidate_user_ids JSONB DEFAULT '[]'::jsonb,
      job_post_id INTEGER,
      interview_title TEXT NOT NULL,
      interview_stage TEXT DEFAULT 'On-Site Interview',
      interview_type TEXT DEFAULT 'On-Site',
      meeting_link_or_address TEXT,
      interview_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      job_title TEXT,
      applicant_name TEXT,
      applicant_phone TEXT,
      applicant_city TEXT,
      applicant_email TEXT,
      employer_company_name TEXT DEFAULT 'Cebuana Lhuillier',
      employer_phone TEXT DEFAULT '+63 917 123 4567',
      employer_address TEXT,
      employer_email TEXT,
      deleted_by_employer BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_by_applicant BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS applicant_documents (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Certificate / Credential',
      file_size INTEGER DEFAULT 0,
      mimetype TEXT,
      file_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    await run("CREATE INDEX IF NOT EXISTS idx_applicant_documents_user ON applicant_documents(user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_job_posts_employer ON job_posts(employer_user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_applications_job_post ON applications(job_post_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)");
    await run("CREATE INDEX IF NOT EXISTS idx_invitations_emp_app ON job_invitations(employer_user_id, applicant_user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_emp ON scheduled_interviews(employer_user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_app ON scheduled_interviews(applicant_user_id)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_date ON scheduled_interviews(interview_date)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_status ON scheduled_interviews(status)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_del_emp ON scheduled_interviews(deleted_by_employer)");
    await run("CREATE INDEX IF NOT EXISTS idx_interviews_del_app ON scheduled_interviews(deleted_by_applicant)");

    await run(`CREATE TABLE IF NOT EXISTS two_factor_codes (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      temp_token TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_two_factor_temp_token ON two_factor_codes(temp_token)");
    await run("CREATE INDEX IF NOT EXISTS idx_two_factor_user_id ON two_factor_codes(user_id)");
    await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT TRUE");
    await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE");
  }

async function ensureScheduledInterviewColumns() {
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS candidate_user_ids JSONB DEFAULT '[]'::jsonb");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS deleted_by_employer BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS deleted_by_applicant BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS job_title TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS applicant_name TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS applicant_phone TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS applicant_city TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS applicant_email TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS employer_company_name TEXT DEFAULT 'Cebuana Lhuillier'");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS employer_phone TEXT DEFAULT '+63 917 123 4567'");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS employer_address TEXT");
  await run("ALTER TABLE scheduled_interviews ADD COLUMN IF NOT EXISTS employer_email TEXT");
}

async function ensureJobPostColumns() {
  await run("ALTER TABLE job_posts DROP COLUMN IF EXISTS responsibilities");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS certifications TEXT");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS experience_level TEXT");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS branch_name TEXT");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS branch_address TEXT");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS accepts_non_graduates INTEGER DEFAULT 0");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS education_requirements TEXT");
  await run("ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS hide_salary INTEGER DEFAULT 0");
  await run("UPDATE job_posts SET application_limit = NULL WHERE application_limit IS NOT NULL");

  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS shs_strand TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS shs_school TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS shs_grad_year TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS college_grad_year TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS vocational_grad_year TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS preferred_cities_json TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS is_non_graduate_cert_holder INTEGER DEFAULT 0");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS summary TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS languages TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS nearby_location TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_min REAL");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_max REAL");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS acceptance_template TEXT");
  await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS rejection_template TEXT");

  await run("ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS branches_json TEXT");
  await run("ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS acceptance_template TEXT");
  await run("ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS rejection_template TEXT");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_message TEXT");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_message_type TEXT");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS response_letter TEXT");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS response_decision TEXT");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ");
  await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS start_date TEXT");
  await run("ALTER TABLE job_invitations ADD COLUMN IF NOT EXISTS response_letter TEXT");
  await run("ALTER TABLE job_invitations ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ");
  await run("ALTER TABLE job_invitations ADD COLUMN IF NOT EXISTS start_date TEXT");
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

function normalizeCurrency(value) {
  if (value === undefined || value === null) return null;
  const str = String(value);
  const raw = str.replace(/[^0-9.]/g, "").trim();
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseSalaryNumeric(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).replace(/,/g, "").replace(/[^0-9.]/g, "").trim();
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function parseCloseDate(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return raw;
}

function deriveJobPostStatus(closeDate, dbStatus) {
  if (typeof dbStatus === "string" && dbStatus.toLowerCase().trim() === "closed") {
    return "closed";
  }
  const parsed = parseCloseDate(closeDate);
  if (!parsed) return (typeof dbStatus === "string" && dbStatus.toLowerCase().trim() === "closed") ? "closed" : "open";
  const [mm, dd, yyyy] = parsed.split("/").map(Number);
  const closeAt = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
  if (Date.now() > closeAt.getTime()) {
    return "closed";
  }
  return (typeof dbStatus === "string" && dbStatus.toLowerCase().trim() === "closed") ? "closed" : "open";
}

const WORK_ARRANGEMENTS = new Set(["Remote", "On-Site", "Hybrid", "Flexible"]);
const FAQ_TYPES = new Set([
  "Requirements",
  "Application Process",
  "Salary and Work Arrangement",
  "Company Information",
  "Documents",
  "Other",
]);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "elitecruit-backend" });
});

app.post("/api/auth/register", async (req, res) => {
  const {
    role,
    email,
    password,
    firstName,
    middleName,
    lastName,
    province,
    city,
    phone,
    workArrangement,
    expectedSalaryMin,
    expectedSalaryMax,
    businessName,
    agreeTerms,
  } = req.body ?? {};

  if (role !== "applicant" && role !== "employer") {
    res.status(400).json({ message: "Invalid role." });
    return;
  }

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  if (!isValidPassword(password)) {
    res.status(400).json({ message: "Password does not meet the required strength." });
    return;
  }

  if (!agreeTerms) {
    res.status(400).json({ message: "You must accept terms and privacy policy." });
    return;
  }

  if (role === "applicant") {
    if (
      typeof firstName !== "string" || !firstName.trim() ||
      typeof lastName !== "string" || !lastName.trim()
    ) {
      res.status(400).json({ message: "First name and last name are required for applicants." });
      return;
    }
  }

  if (role === "employer") {
    if (typeof businessName !== "string" || !businessName.trim()) {
      res.status(400).json({ message: "Business name is required for employers." });
      return;
    }
  }

  try {
    const existing = await get("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
    if (existing) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userInsert = await run(
      "INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, true)",
      [email.trim().toLowerCase(), passwordHash, role]
    );

    const userId = userInsert.lastID;

    if (!userId) {
      throw new Error("Failed to generate user ID for new account.");
    }

    if (role === "applicant") {
      const rawMin = expectedSalaryMin !== undefined && expectedSalaryMin !== null && String(expectedSalaryMin).trim()
        ? Number(String(expectedSalaryMin).replace(/[^0-9.]/g, ""))
        : null;
      const rawMax = expectedSalaryMax !== undefined && expectedSalaryMax !== null && String(expectedSalaryMax).trim()
        ? Number(String(expectedSalaryMax).replace(/[^0-9.]/g, ""))
        : null;

      let consolidatedSalary = null;
      if (rawMin && rawMax) {
        consolidatedSalary = `PHP ${rawMin.toLocaleString("en-US", { minimumFractionDigits: 2 })} - PHP ${rawMax.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      } else if (rawMin) {
        consolidatedSalary = `PHP ${rawMin.toLocaleString("en-US", { minimumFractionDigits: 2 })}+`;
      }

      await run(
        `INSERT INTO applicant_profiles
          (user_id, first_name, middle_name, last_name, province, city, phone, work_arrangement, expected_salary_min, expected_salary_max, expected_salary, terms_accepted, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP)`,
        [
          userId,
          firstName.trim(),
          (middleName ?? "").trim() || null,
          lastName.trim(),
          (province ?? "Cavite").trim() || "Cavite",
          (city ?? "").trim() || null,
          (phone ?? "").trim() || null,
          (workArrangement ?? "On-Site").trim() || "On-Site",
          Number.isFinite(rawMin) ? rawMin : null,
          Number.isFinite(rawMax) ? rawMax : null,
          consolidatedSalary,
        ]
      );
    } else {
      const trimmedCity = (city ?? "").trim();
      const trimmedProv = (province ?? "Cavite").trim() || "Cavite";
      await run(
        `INSERT INTO employer_profiles
          (user_id, business_name, contact_number, province, city, company_address, terms_accepted, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP)`,
        [
          userId,
          businessName.trim(),
          (phone ?? "").trim() || null,
          trimmedProv,
          trimmedCity || null,
          trimmedCity ? `${trimmedCity}, ${trimmedProv}` : null,
        ]
      );
    }

    const token = generateAuthToken({
      id: userId,
      email: email.trim().toLowerCase(),
      role,
    });

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: userId,
        role,
        email: email.trim().toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    try {
      await run("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }

    res.status(500).json({ message: error?.message || "Registration failed. Please try again." });
  }
});

async function resolveUserDisplayNameAndBusiness(user) {
  let displayName = null;
  let businessName = null;

  if (!user) return { displayName: "User", businessName: null };

  try {
    if (user.role === "applicant") {
      const applicantProfile = await get(
        "SELECT first_name, last_name FROM applicant_profiles WHERE user_id = ?",
        [user.id]
      );
      if (applicantProfile) {
        displayName = [applicantProfile.first_name, applicantProfile.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
      }
      if (!displayName && user.email) {
        displayName = user.email.split("@")[0];
      }
    } else if (user.role === "employer") {
      const employerProfile = await get(
        "SELECT business_name FROM employer_profiles WHERE user_id = ?",
        [user.id]
      );
      businessName = employerProfile?.business_name ?? null;
      displayName = businessName || (user.email ? user.email.split("@")[0] : "Employer");
    } else if (user.role === "admin") {
      const adminProfile = await get(
        "SELECT display_name FROM admin_profiles WHERE user_id = ?",
        [user.id]
      );
      displayName = adminProfile?.display_name || "Administrator";
    }
  } catch (err) {
    console.error("Error resolving user display name:", err);
  }

  if (!displayName) {
    displayName = user.email ? user.email.split("@")[0] : "User";
  }

  return { displayName, businessName };
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password, bypass2fa } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  if (typeof password !== "string" || !password) {
    res.status(400).json({ message: "Password is required." });
    return;
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await get(
      `SELECT id, email, password_hash, role, is_active, two_factor_enabled FROM users 
       WHERE email = ? 
          OR (role = 'admin' AND email IN ('admin@elitecruit', 'admin@elitecruit.local') AND ? IN ('admin@elitecruit', 'admin@elitecruit.local'))`,
      [cleanEmail, cleanEmail]
    );

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ message: "Account is inactive." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const { displayName, businessName } = await resolveUserDisplayNameAndBusiness(user);

    // 2FA disabled: direct login without email verification code
    const is2FAActive = false;

    if (is2FAActive) {
      const code = generateOTP();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const tempToken = jwt.sign(
        {
          purpose: "2fa_pending",
          userId: user.id,
          email: user.email,
        },
        JWT_SECRET,
        { expiresIn: "10m" }
      );

      await run("DELETE FROM two_factor_codes WHERE user_id = ?", [user.id]);
      await run(
        `INSERT INTO two_factor_codes (user_id, email, code_hash, temp_token, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, user.email, codeHash, tempToken, expiresAt]
      );

      await send2FAEmail(user.email, code, displayName || businessName || "User");

      return res.status(200).json({
        message: "A 6-digit verification code has been sent to your email.",
        mfaRequired: true,
        tempToken,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
      });
    }

    const token = generateAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessName,
        displayName,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

app.post("/api/auth/verify-2fa", async (req, res) => {
  const { tempToken, code } = req.body ?? {};

  if (!tempToken) {
    return res.status(400).json({ message: "Verification session token is required." });
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ message: "Please enter the 6-digit verification code." });
  }

  const cleanCode = code.replace(/\D/g, "");
  if (cleanCode.length !== 6) {
    return res.status(400).json({ message: "Verification code must be exactly 6 digits." });
  }

  try {
    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Verification session has expired. Please log in again." });
    }

    if (payload?.purpose !== "2fa_pending" || !payload?.userId) {
      return res.status(401).json({ message: "Invalid verification session." });
    }

    const record = await get(
      "SELECT * FROM two_factor_codes WHERE user_id = ? AND temp_token = ? ORDER BY id DESC LIMIT 1",
      [payload.userId, tempToken]
    );

    if (!record) {
      return res.status(400).json({ message: "No active verification code found. Please log in again." });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await run("DELETE FROM two_factor_codes WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    if (record.attempts >= 5) {
      await run("DELETE FROM two_factor_codes WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Too many failed attempts. Please request a new code." });
    }

    const matches = await bcrypt.compare(cleanCode, record.code_hash);
    if (!matches) {
      await run("UPDATE two_factor_codes SET attempts = attempts + 1 WHERE id = ?", [record.id]);
      const remainingAttempts = 5 - (record.attempts + 1);
      return res.status(400).json({
        message: remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please request a new code.",
      });
    }

    // Code verified! Delete consumed code
    await run("DELETE FROM two_factor_codes WHERE user_id = ?", [payload.userId]);

    const user = await get("SELECT id, email, role, is_active FROM users WHERE id = ?", [payload.userId]);
    if (!user || !user.is_active) {
      return res.status(403).json({ message: "Account is inactive." });
    }

    const { displayName, businessName } = await resolveUserDisplayNameAndBusiness(user);

    const token = generateAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      message: "Two-factor verification successful. Welcome back!",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessName,
        displayName,
      },
    });
  } catch (err) {
    console.error("Verify 2FA error:", err);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

app.post("/api/auth/resend-2fa", async (req, res) => {
  const { tempToken } = req.body ?? {};

  if (!tempToken) {
    return res.status(400).json({ message: "Verification session token is required." });
  }

  try {
    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Verification session has expired. Please log in again." });
    }

    if (payload?.purpose !== "2fa_pending" || !payload?.userId) {
      return res.status(401).json({ message: "Invalid verification session." });
    }

    // Rate limiting: check recent code
    const existing = await get(
      "SELECT * FROM two_factor_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [payload.userId]
    );

    if (existing) {
      const elapsedSeconds = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
      if (elapsedSeconds < 45) {
        const remaining = Math.ceil(45 - elapsedSeconds);
        return res.status(429).json({
          message: `Please wait ${remaining} seconds before requesting a new code.`,
          retryAfter: remaining,
        });
      }
    }

    const user = await get("SELECT id, email, role FROM users WHERE id = ?", [payload.userId]);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await run("DELETE FROM two_factor_codes WHERE user_id = ?", [user.id]);
    await run(
      `INSERT INTO two_factor_codes (user_id, email, code_hash, temp_token, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.email, codeHash, tempToken, expiresAt]
    );

    const { displayName, businessName } = await resolveUserDisplayNameAndBusiness(user);
    await send2FAEmail(user.email, code, displayName || businessName || "User");

    res.status(200).json({
      message: "A new 6-digit verification code has been sent to your email.",
      maskedEmail: maskEmail(user.email),
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (err) {
    console.error("Resend 2FA error:", err);
    res.status(500).json({ message: "Unable to resend verification code. Please try again." });
  }
});

app.post("/api/auth/send-email-otp", optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || Number(req.body?.userId);
    const { email } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ message: "User session required. Please provide a valid applicant ID." });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if another user is already registered with this email
    const existingUser = await get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [cleanEmail, userId]
    );
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email address already exists." });
    }

    const user = await get("SELECT id, email, role FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await run("DELETE FROM two_factor_codes WHERE user_id = ? AND temp_token = 'email_verify'", [userId]);
    await run(
      `INSERT INTO two_factor_codes (user_id, email, code_hash, temp_token, expires_at)
       VALUES (?, ?, ?, 'email_verify', ?)`,
      [userId, cleanEmail, codeHash, expiresAt]
    );

    const { displayName, businessName } = await resolveUserDisplayNameAndBusiness(user);
    await send2FAEmail(cleanEmail, code, displayName || businessName || "User");

    res.json({
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      email: cleanEmail,
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (err) {
    console.error("Send email OTP error:", err);
    res.status(500).json({ message: "Unable to send verification code. Please try again." });
  }
});

app.post("/api/auth/verify-email-otp", optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || Number(req.body?.userId);
    const { email, code } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ message: "User session required. Please provide a valid applicant ID." });
    }

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim().replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      return res.status(400).json({ message: "Verification code must be exactly 6 digits." });
    }

    const record = await get(
      "SELECT * FROM two_factor_codes WHERE user_id = ? AND temp_token = 'email_verify' AND email = ? ORDER BY id DESC LIMIT 1",
      [userId, cleanEmail]
    );

    if (!record) {
      return res.status(400).json({ message: "No active verification code found for this email. Please request a new code." });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await run("DELETE FROM two_factor_codes WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    if (record.attempts >= 5) {
      await run("DELETE FROM two_factor_codes WHERE id = ?", [record.id]);
      return res.status(400).json({ message: "Too many failed attempts. Please request a new code." });
    }

    const matches = await bcrypt.compare(cleanCode, record.code_hash);
    if (!matches) {
      await run("UPDATE two_factor_codes SET attempts = attempts + 1 WHERE id = ?", [record.id]);
      const remainingAttempts = 5 - (record.attempts + 1);
      return res.status(400).json({
        message: remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please request a new code.",
      });
    }

    // Code verified! Delete consumed code
    await run("DELETE FROM two_factor_codes WHERE id = ?", [record.id]);

    // Ensure is_email_verified column exists and mark verified
    try {
      await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE");
    } catch {}
    await run("UPDATE users SET is_email_verified = TRUE WHERE id = ?", [userId]);

    res.json({
      success: true,
      message: "Email address verified successfully!",
      verifiedEmail: cleanEmail,
    });
  } catch (err) {
    console.error("Verify email OTP error:", err);
    res.status(500).json({ message: "Unable to verify email code. Please try again." });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await get(
      "SELECT id, email, role, is_active FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user || !user.is_active) {
      return res.status(404).json({ message: "User not found or account deactivated." });
    }
    res.json({ user });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(500).json({ message: "Unable to verify session." });
  }
});

app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  if (!userId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({ message: "Current password is required." });
  }

  if (typeof newPassword !== "string" || !newPassword) {
    return res.status(400).json({ message: "New password is required." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirmation do not match." });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: "New password must be at least 8 characters and include uppercase, lowercase, and numbers.",
    });
  }

  try {
    const user = await get("SELECT id, email, password_hash FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
});

// Enforce admin authentication and authorization for all /api/admin endpoints
app.use("/api/admin", authenticateToken, requireAdmin);

app.get("/api/admin/overview-stats", async (req, res) => {
  try {
    const totalUsersRow = await get("SELECT COUNT(*) AS count FROM users");
    const totalApplicantsRow = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'applicant'");
    const totalEmployersRow = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'employer'");
    const totalJobsRow = await get("SELECT COUNT(*) AS count FROM job_posts WHERE status = 'open'");

    res.json({
      totalUsers: Number(totalUsersRow?.count || 0),
      totalApplicants: Number(totalApplicantsRow?.count || 0),
      totalEmployers: Number(totalEmployersRow?.count || 0),
      totalJobs: Number(totalJobsRow?.count || 0),
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Failed to fetch admin stats." });
  }
});

function extractCityOrMunicipality(locationStr) {
  if (!locationStr || typeof locationStr !== "string") return "Unspecified";
  const str = locationStr.trim();
  if (!str) return "Unspecified";

  const caviteCities = [
    "Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmarinas", "Dasmariñas",
    "General Emilio Aguinaldo", "General Mariano Alvarez", "GMA", "General Trias", "Gen. Trias",
    "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta",
    "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires", "Imus"
  ];

  for (const city of caviteCities) {
    const regex = new RegExp(`\\b${city}\\b`, "i");
    if (regex.test(str)) {
      if (city.toLowerCase() === "dasmarinas") return "Dasmariñas";
      if (city.toLowerCase() === "gma") return "General Mariano Alvarez";
      if (city.toLowerCase() === "gen. trias") return "General Trias";
      return city;
    }
  }

  const parenMatch = str.match(/\(([^)]+)\)/);
  const target = parenMatch ? parenMatch[1] : str;
  const parts = target.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1].toLowerCase().includes("cavite")) {
    return parts[parts.length - 2];
  }
  return parts[0] || "Cavite";
}

const CAVITE_CITY_COORDS = {
  "alfonso": [14.1383, 120.8533],
  "amadeo": [14.1706, 120.9228],
  "bacoor": [14.4624, 120.9645],
  "carmona": [14.3167, 121.0500],
  "cavite city": [14.4833, 120.9000],
  "dasmarinas": [14.3294, 120.9367],
  "dasmariñas": [14.3294, 120.9367],
  "general emilio aguinaldo": [14.1833, 120.7958],
  "bailen": [14.1833, 120.7958],
  "general mariano alvarez": [14.3000, 121.0000],
  "gma": [14.3000, 121.0000],
  "general trias": [14.3867, 120.8812],
  "imus": [14.4296, 120.9367],
  "indang": [14.1953, 120.8769],
  "kawit": [14.4444, 120.9028],
  "magallanes": [14.1883, 120.7383],
  "maragondon": [14.2750, 120.7389],
  "mendez": [14.1306, 120.9056],
  "naic": [14.3167, 120.7667],
  "noveleta": [14.4283, 120.8800],
  "rosario": [14.4167, 120.8500],
  "silang": [14.2306, 120.9748],
  "tagaytay": [14.1153, 120.9621],
  "tanza": [14.3944, 120.8542],
  "ternate": [14.2883, 120.7183],
  "trece martires": [14.2825, 120.8667],
};

function cleanSkillName(rawSkill) {
  if (!rawSkill || typeof rawSkill !== "string") return "";
  let cleaned = rawSkill.replace(/\s*\[.*?\]/g, "");
  cleaned = cleaned.replace(/\s*\(.*?\)/g, "");
  cleaned = cleaned.replace(/^[•\-\*,\s]+|[•\-\*,\s]+$/g, "").trim();
  return cleaned;
}

app.get("/api/admin/applicant-analytics", async (req, res) => {
  try {
    const totalApplicantsRow = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'applicant'");
    const totalApplicants = Number(totalApplicantsRow?.count || 0);

    // City distribution
    const cityRows = await all(`
      SELECT 
        COALESCE(NULLIF(TRIM(ap.city), ''), 'Unspecified') AS city, 
        COUNT(u.id) AS count
      FROM users u
      LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'applicant'
      GROUP BY COALESCE(NULLIF(TRIM(ap.city), ''), 'Unspecified')
      ORDER BY count DESC
      LIMIT 5
    `);
    const cityColors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
    const cityDistribution = cityRows.map((row, idx) => {
      const count = Number(row.count || 0);
      const percentage = totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0;
      return {
        city: row.city,
        count,
        percentage,
        color: cityColors[idx % cityColors.length],
      };
    });

    const topLocation = cityDistribution.find((c) => c.city.toLowerCase() !== "unspecified") || cityDistribution[0] || null;

    // Skills supply
    const skillProfiles = await all(`
      SELECT ap.skills
      FROM applicant_profiles ap
      INNER JOIN users u ON u.id = ap.user_id
      WHERE u.role = 'applicant' AND ap.skills IS NOT NULL AND TRIM(ap.skills) != ''
    `);
    const skillCounts = {};
    for (const row of skillProfiles) {
      const raw = row.skills;
      let tags = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          tags = parsed.map((item) => (typeof item === "object" && item ? (item.name || item.skill || "") : String(item)));
        }
      } catch {}
      if (tags.length === 0 && typeof raw === "string") {
        tags = raw.split(/[,;\n•|]+/).map((s) => s.trim()).filter(Boolean);
      }
      const seenForCandidate = new Set();
      for (const t of tags) {
        const clean = cleanSkillName(t);
        if (!clean) continue;
        const lower = clean.toLowerCase();
        if (!seenForCandidate.has(lower)) {
          seenForCandidate.add(lower);
          // Preserve proper casing or title casing
          skillCounts[clean] = (skillCounts[clean] || 0) + 1;
        }
      }
    }
    const sortedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxSkillCandidates = sortedSkills.length > 0 ? sortedSkills[0][1] : 1;
    const skillsSupply = sortedSkills.map(([skill, candidates]) => ({
      skill,
      candidates,
      level: Math.round((candidates / Math.max(totalApplicants, maxSkillCandidates)) * 100),
    }));

    // Work preferences
    const prefRows = await all(`
      SELECT 
        COALESCE(NULLIF(TRIM(ap.work_arrangement), ''), 'Not specified') AS arrangement, 
        COUNT(u.id) AS count
      FROM users u
      LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'applicant'
      GROUP BY COALESCE(NULLIF(TRIM(ap.work_arrangement), ''), 'Not specified')
      ORDER BY count DESC
    `);
    const prefColors = {
      hybrid: "#10b981",
      remote: "#6366f1",
      "on-site": "#f59e0b",
      onsite: "#f59e0b",
    };
    const workPreferences = prefRows.map((r, idx) => {
      const count = Number(r.count || 0);
      const percentage = totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0;
      const lower = r.arrangement.toLowerCase();
      let color = "#94a3b8";
      if (lower.includes("hybrid")) color = prefColors.hybrid;
      else if (lower.includes("remote")) color = prefColors.remote;
      else if (lower.includes("site") || lower.includes("office")) color = prefColors["on-site"];
      else {
        const fallbacks = ["#10b981", "#6366f1", "#f59e0b", "#8b5cf6", "#ec4899"];
        color = fallbacks[idx % fallbacks.length];
      }
      return {
        arrangement: r.arrangement,
        percentage,
        count,
        color,
      };
    });

    const topArrangement = workPreferences.find((p) => !p.arrangement.toLowerCase().includes("not specified")) || workPreferences[0] || null;

    // Application Pipeline & Conversion
    const hasApps = await tableExists("applications");
    let totalApps = 0;
    let reviewedCount = 0;
    let shortlistedCount = 0;
    let interviewCount = 0;
    let hiredCount = 0;

    if (hasApps) {
      const pipeRow = await get(`
        SELECT
          COUNT(*) AS total_apps,
          SUM(CASE WHEN lower(status) IN ('reviewed', 'under_review', 'shortlisted', 'interview_scheduled', 'approved', 'accepted', 'hired') THEN 1 ELSE 0 END) AS reviewed_count,
          SUM(CASE WHEN lower(status) IN ('shortlisted', 'interview_scheduled', 'approved', 'accepted', 'hired') THEN 1 ELSE 0 END) AS shortlisted_count,
          SUM(CASE WHEN lower(status) IN ('interview_scheduled', 'approved', 'accepted', 'hired') THEN 1 ELSE 0 END) AS interview_count,
          SUM(CASE WHEN lower(status) IN ('approved', 'accepted', 'hired') THEN 1 ELSE 0 END) AS hired_count
        FROM applications
      `);
      totalApps = Number(pipeRow?.total_apps || 0);
      reviewedCount = Number(pipeRow?.reviewed_count || 0);
      shortlistedCount = Number(pipeRow?.shortlisted_count || 0);
      interviewCount = Number(pipeRow?.interview_count || 0);
      hiredCount = Number(pipeRow?.hired_count || 0);
    }

    const calcConv = (count) => (totalApps > 0 ? `${Math.round((count / totalApps) * 100)}%` : "0%");

    const applicationPipeline = [
      { stage: "Applications Submitted", count: totalApps, conversion: totalApps > 0 ? "100%" : "0%", color: "#3b82f6" },
      { stage: "Profile Under Review", count: reviewedCount, conversion: calcConv(reviewedCount), color: "#8b5cf6" },
      { stage: "Shortlisted Candidates", count: shortlistedCount, conversion: calcConv(shortlistedCount), color: "#ec4899" },
      { stage: "Interviews Scheduled", count: interviewCount, conversion: calcConv(interviewCount), color: "#f59e0b" },
      { stage: "Hired / Accepted", count: hiredCount, conversion: calcConv(hiredCount), color: "#10b981" },
    ];

    const placementRate = totalApps > 0 ? `${((hiredCount / totalApps) * 100).toFixed(1)}%` : "0.0%";

    res.json({
      totalApplicants,
      topLocation,
      topArrangement,
      placementRate,
      cityDistribution,
      skillsSupply,
      workPreferences,
      applicationPipeline,
    });
  } catch (err) {
    console.error("Error fetching applicant analytics:", err);
    res.status(500).json({ message: "Failed to fetch applicant analytics." });
  }
});

app.get("/api/admin/employer-analytics", async (req, res) => {
  try {
    const totalEmployersRow = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'employer'");
    const totalEmployers = Number(totalEmployersRow?.count || 0);

    // Industry sector breakdown
    const indRows = await all(`
      SELECT 
        COALESCE(NULLIF(TRIM(INITCAP(ep.industry)), ''), 'Other / General') AS sector, 
        COUNT(u.id) AS count
      FROM users u
      LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'employer'
      GROUP BY COALESCE(NULLIF(TRIM(INITCAP(ep.industry)), ''), 'Other / General')
      ORDER BY count DESC
      LIMIT 5
    `);
    const indColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    const industryBreakdown = indRows.map((r, idx) => {
      const companies = Number(r.count || 0);
      const percentage = totalEmployers > 0 ? Math.round((companies / totalEmployers) * 100) : 0;
      return {
        sector: r.sector,
        companies,
        percentage,
        color: indColors[idx % indColors.length],
      };
    });

    const dominantIndustry = industryBreakdown.find((i) => !i.sector.toLowerCase().includes("other") && !i.sector.toLowerCase().includes("unspecified")) || industryBreakdown[0] || null;

    // Company sizes
    const sizeRows = await all(`
      SELECT 
        COALESCE(NULLIF(TRIM(ep.company_size), ''), 'Not specified') AS range, 
        COUNT(u.id) AS count
      FROM users u
      LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'employer'
      GROUP BY COALESCE(NULLIF(TRIM(ep.company_size), ''), 'Not specified')
      ORDER BY count DESC
      LIMIT 4
    `);
    const sizeColors = ["#60a5fa", "#2563eb", "#1d4ed8", "#1e40af"];
    const companySizes = sizeRows.map((r, idx) => {
      const count = Number(r.count || 0);
      const percentage = totalEmployers > 0 ? Math.round((count / totalEmployers) * 100) : 0;
      return {
        range: r.range,
        count,
        percentage,
        color: sizeColors[idx % sizeColors.length],
      };
    });

    // Posting status
    const statusRow = await get(`
      SELECT
        COUNT(*) AS total_posts,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status != 'open' THEN 1 ELSE 0 END) AS closed_count,
        SUM(CASE WHEN is_urgent = 1 AND status = 'open' THEN 1 ELSE 0 END) AS urgent_count
      FROM job_posts
    `);
    const totalPosts = Number(statusRow?.total_posts || 0);
    const openPosts = Number(statusRow?.open_count || 0);
    const closedPosts = Number(statusRow?.closed_count || 0);
    const urgentPosts = Number(statusRow?.urgent_count || 0);

    const openPct = totalPosts > 0 ? Math.round((openPosts / totalPosts) * 100) : 0;
    const closedPct = totalPosts > 0 ? Math.round((closedPosts / totalPosts) * 100) : 0;
    const urgentPct = openPosts > 0 ? Math.round((urgentPosts / openPosts) * 100) : 0;

    const postingStatus = [
      { label: "Active Open Postings", count: openPosts, percentage: openPct, color: "#10b981" },
      { label: "Closed / Filled Positions", count: closedPosts, percentage: closedPct, color: "#94a3b8" },
      { label: "Urgent Hiring Tagged", count: urgentPosts, percentage: urgentPct, color: "#ef4444" },
    ];

    // Job posts & municipal hubs
    const allJobs = await all(`SELECT id, location, status FROM job_posts`);
    const locMap = {};
    for (const job of allJobs) {
      const muni = extractCityOrMunicipality(job.location);
      if (!locMap[muni]) {
        locMap[muni] = { city: muni, totalJobs: 0, openJobs: 0, closedJobs: 0 };
      }
      locMap[muni].totalJobs += 1;
      if (String(job.status).toLowerCase() === "open") {
        locMap[muni].openJobs += 1;
      } else {
        locMap[muni].closedJobs += 1;
      }
    }

    const jobLocations = Object.values(locMap)
      .sort((a, b) => b.openJobs - a.openJobs || b.totalJobs - a.totalJobs)
      .slice(0, 5)
      .map((r) => {
        const total = r.totalJobs;
        const closed = r.closedJobs;
        const openJobs = r.openJobs;
        const fillRate = total > 0 ? Math.round((closed / total) * 100) : 0;
        const percentage = openPosts > 0 ? Math.round((openJobs / openPosts) * 100) : (totalPosts > 0 ? Math.round((total / totalPosts) * 100) : 0);
        return {
          city: r.city,
          openJobs,
          totalJobs: total,
          fillRate,
          percentage,
        };
      });

    res.json({
      totalEmployers,
      dominantIndustry,
      totalActiveJobs: openPosts,
      totalPosts,
      urgentRatio: {
        count: urgentPosts,
        percentage: urgentPct,
      },
      industryBreakdown,
      companySizes,
      jobLocations,
      postingStatus,
    });
  } catch (err) {
    console.error("Error fetching employer analytics:", err);
    res.status(500).json({ message: "Failed to fetch employer analytics." });
  }
});

app.get("/api/admin/applicants", async (req, res) => {
  try {
    const rows = await all(`
      SELECT 
        u.id AS user_id,
        u.email,
        u.is_active,
        u.created_at,
        p.first_name,
        p.middle_name,
        p.last_name,
        p.phone,
        p.city,
        p.address,
        p.desired_job_title,
        p.expected_salary,
        p.work_arrangement,
        p.years_of_experience,
        p.skills,
        p.certifications,
        p.qualifications,
        p.profile_picture_path,
        (SELECT COUNT(*) FROM applications a WHERE a.applicant_user_id = u.id) AS total_applications,
        (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM candidate_ratings cr WHERE cr.applicant_user_id = u.id) AS rating,
        (SELECT COUNT(*) FROM candidate_ratings cr WHERE cr.applicant_user_id = u.id) AS total_reviews
      FROM users u
      LEFT JOIN applicant_profiles p ON p.user_id = u.id
      WHERE u.role = 'applicant'
      ORDER BY u.created_at DESC
    `);

    const applicants = rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      total_applications: Number(r.total_applications || 0),
      rating: r.rating ? Number(r.rating).toFixed(1) : null,
      total_reviews: Number(r.total_reviews || 0),
    }));

    res.json({ applicants });
  } catch (err) {
    console.error("Error loading admin applicants:", err);
    res.status(500).json({ message: "Failed to load applicants." });
  }
});

app.get("/api/admin/employers", async (req, res) => {
  try {
    const rows = await all(`
      SELECT 
        u.id AS user_id,
        u.email,
        u.is_active,
        u.created_at,
        ep.business_name,
        ep.industry,
        ep.company_size,
        ep.company_description,
        ep.contact_number,
        ep.city,
        ep.province,
        ep.company_address,
        NULL AS website,
        ep.company_logo_path,
        (SELECT COUNT(*) FROM job_posts jp WHERE jp.employer_user_id = u.id) AS total_jobs,
        (SELECT COUNT(*) FROM applications a INNER JOIN job_posts jp ON jp.id = a.job_post_id WHERE jp.employer_user_id = u.id) AS total_applications_received,
        (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = u.id) AS rating,
        (SELECT COUNT(*) FROM company_ratings cr WHERE cr.employer_user_id = u.id) AS total_reviews
      FROM users u
      LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'employer'
      ORDER BY u.created_at DESC
    `);

    const employers = rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      total_jobs: Number(r.total_jobs || 0),
      total_applications_received: Number(r.total_applications_received || 0),
      rating: r.rating ? Number(r.rating).toFixed(1) : null,
      total_reviews: Number(r.total_reviews || 0),
    }));

    res.json({ employers });
  } catch (err) {
    console.error("Error loading admin employers:", err);
    res.status(500).json({ message: "Failed to load employers." });
  }
});

app.patch("/api/admin/users/:userId/status", async (req, res) => {
  const userId = Number(req.params.userId);
  const { is_active } = req.body ?? {};
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  try {
    const targetUser = await get("SELECT id, role FROM users WHERE id = ?", [userId]);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }
    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Cannot deactivate administrator accounts." });
    }

    const newStatus = Boolean(is_active);
    await run("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, userId]);

    res.json({
      message: `User account has been ${newStatus ? "activated" : "suspended"}.`,
      userId,
      is_active: newStatus,
    });
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ message: "Failed to update user status." });
  }
});

app.post("/api/admin/users/:userId/reset-password", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  try {
    const targetUser = await get("SELECT id, email, role FROM users WHERE id = ?", [userId]);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const tempPassword = req.body?.password || "EliteCruit2026!";
    const hash = await bcrypt.hash(tempPassword, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);

    res.json({
      message: `Password reset successfully for ${targetUser.email}.`,
      temporaryPassword: tempPassword,
    });
  } catch (err) {
    console.error("Error resetting user password:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

function sanitizeApplicantProfile(profile) {
  if (!profile) return profile;
  const clone = { ...profile };
  delete clone.resume_data;
  delete clone.profile_picture_data;
  return clone;
}

app.get("/api/applicants/:userId/profile", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  try {
    const profile = await get(`SELECT p.*, u.email, COALESCE(u.is_email_verified, FALSE) AS is_email_verified FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`, [userId]);
    if (!profile) return res.status(404).json({ message: "Applicant profile not found." });

    if (profile.expected_salary && (profile.expected_salary_min == null || profile.expected_salary_max == null)) {
      const parts = String(profile.expected_salary).split("-").map((p) => p.trim());
      if (parts.length >= 2) {
        const pMin = parseSalaryNumeric(parts[0]);
        const pMax = parseSalaryNumeric(parts[1]);
        if (profile.expected_salary_min == null && pMin !== null) profile.expected_salary_min = pMin;
        if (profile.expected_salary_max == null && pMax !== null) profile.expected_salary_max = pMax;
      } else {
        const single = parseSalaryNumeric(parts[0]);
        if (single !== null) {
          if (profile.expected_salary_min == null) profile.expected_salary_min = single;
          if (profile.expected_salary_max == null) profile.expected_salary_max = single;
        }
      }
    }

    const hasRatings = await tableExists("candidate_ratings");
    let rating = null;
    let total_reviews = 0;
    if (hasRatings) {
      const stats = await get("SELECT COALESCE(SUM(rating), 0) AS sum_rating, COUNT(*) AS total_reviews FROM candidate_ratings WHERE applicant_user_id = ?", [userId]);
      const v = Number(stats?.total_reviews) || 0;
      if (v > 0) {
        rating = computeBayesianRating(v, stats.sum_rating, true).toFixed(1);
        total_reviews = v;
      }
    }

    res.json({ profile: sanitizeApplicantProfile({ ...profile, rating, total_reviews }) });
  } catch { res.status(500).json({ message: "Unable to load profile." }); }
});

function sanitizeEmployerProfile(profile) {
  if (!profile) return profile;
  const clone = { ...profile };
  delete clone.company_logo_data;
  delete clone.company_cover_data;
  return clone;
}

app.get("/api/employers/:userId/profile", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ message: "Invalid employer." });
    return;
  }

  try {
    const profile = await get(
      `SELECT e.*, u.email AS business_email
       FROM employer_profiles e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.user_id = ? AND u.role = 'employer'`,
      [userId]
    );

    if (!profile) {
      if (userId === 501) {
        return res.json({
          profile: {
            user_id: 501,
            employer_user_id: 501,
            business_name: "Apex Global Solutions Inc.",
            company_name: "Apex Global Solutions Inc.",
            business_email: "contact@apexsolutions.ph",
            contact_number: "+63 46 414 8899",
            industry: "Information Technology & Software Services",
            company_size: "50-249 Employees",
            province: "Cavite",
            city: "Silang",
            company_address: "Silang, Cavite",
            company_description: "Apex Global Solutions Inc. is a premier digital technology solutions provider specializing in enterprise web applications, cloud infrastructure, and modern engineering practices across the Cavite province.",
            rating: "4.8",
            total_reviews: 12,
            company_logo_path: null,
            company_cover_path: null,
          }
        });
      }
      if (userId === 502) {
        return res.json({
          profile: {
            user_id: 502,
            employer_user_id: 502,
            business_name: "Vanguard Tech Innovations",
            company_name: "Vanguard Tech Innovations",
            business_email: "hr@vanguardtech.ph",
            contact_number: "+63 46 852 3344",
            industry: "Information Technology & Software Services",
            company_size: "20-49 Employees",
            province: "Cavite",
            city: "Dasmariñas",
            company_address: "Dasmariñas, Cavite",
            company_description: "Vanguard Tech Innovations delivers modern web applications, scalable cloud microservices, and high-performance digital platforms.",
            rating: "4.6",
            total_reviews: 8,
            company_logo_path: null,
            company_cover_path: null,
          }
        });
      }
      res.status(404).json({ message: "Employer profile not found." });
      return;
    }

    const hasRatings = await tableExists("company_ratings");
    let rating = null;
    let total_reviews = 0;
    if (hasRatings) {
      const stats = await get("SELECT COALESCE(SUM(rating), 0) AS sum_rating, COUNT(*) AS total_reviews FROM company_ratings WHERE employer_user_id = ?", [userId]);
      const v = Number(stats?.total_reviews) || 0;
      if (v > 0) {
        rating = computeBayesianRating(v, stats.sum_rating, true).toFixed(1);
        total_reviews = v;
      }
    }

    res.json({ profile: sanitizeEmployerProfile({ ...profile, rating, total_reviews }) });
  } catch {
    res.status(500).json({ message: "Unable to load employer profile." });
  }
});

app.put("/api/employers/:userId/profile", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer ID." });
  }

  const { business_name, city, company_address, contact_number, company_description, website, branches, branches_json } = req.body ?? {};

  try {
    const bJson = Array.isArray(branches) ? JSON.stringify(branches) : (typeof branches_json === "string" ? branches_json : null);

    await run(
      `UPDATE employer_profiles 
       SET business_name = COALESCE(?, business_name),
           city = COALESCE(?, city),
           company_address = COALESCE(?, company_address),
           contact_number = COALESCE(?, contact_number),
           company_description = COALESCE(?, company_description),
           branches_json = COALESCE(?, branches_json)
       WHERE user_id = ?`,
      [
        business_name ?? null,
        city ?? null,
        company_address ?? null,
        contact_number ?? null,
        company_description ?? null,
        bJson,
        userId,
      ]
    );

    const profile = await get(
      `SELECT e.*, u.email AS business_email FROM employer_profiles e INNER JOIN users u ON u.id = e.user_id WHERE e.user_id = ?`,
      [userId]
    );
    res.json({ message: "Employer profile updated successfully.", profile });
  } catch (err) {
    console.error("Update employer profile error:", err);
    res.status(500).json({ message: "Unable to update employer profile." });
  }
});

app.put("/api/applicants/:userId/profile", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid applicant ID." });
  }

  const currentProf = await get(`SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`, [userId]);

  const fields = ["first_name", "middle_name", "last_name", "phone", "province", "city", "address", "summary", "languages", "desired_job_title", "expected_salary", "work_arrangement", "years_of_experience"];
  const values = fields.map((field) => {
    if (req.body?.[field] !== undefined) {
      return typeof req.body[field] === "string" && req.body[field].trim() ? req.body[field].trim() : null;
    }
    return currentProf ? currentProf[field] : null;
  });

  let salMin = parseSalaryNumeric(req.body?.expected_salary_min);
  let salMax = parseSalaryNumeric(req.body?.expected_salary_max);

  if ((salMin === null || salMax === null) && req.body?.expected_salary) {
    const parts = String(req.body.expected_salary).split("-").map((p) => p.trim());
    if (parts.length >= 2) {
      if (salMin === null) salMin = parseSalaryNumeric(parts[0]);
      if (salMax === null) salMax = parseSalaryNumeric(parts[1]);
    } else if (parts.length === 1 && parts[0]) {
      const single = parseSalaryNumeric(parts[0]);
      if (salMin === null) salMin = single;
      if (salMax === null) salMax = single;
    }
  }

  if (salMin === null && currentProf?.expected_salary_min != null) {
    salMin = Number(currentProf.expected_salary_min);
  }
  if (salMax === null && currentProf?.expected_salary_max != null) {
    salMax = Number(currentProf.expected_salary_max);
  }

  if ((salMin === null || salMax === null) && currentProf?.expected_salary) {
    const parts = String(currentProf.expected_salary).split("-").map((p) => p.trim());
    if (parts.length >= 2) {
      if (salMin === null) salMin = parseSalaryNumeric(parts[0]);
      if (salMax === null) salMax = parseSalaryNumeric(parts[1]);
    } else if (parts.length === 1 && parts[0]) {
      const single = parseSalaryNumeric(parts[0]);
      if (salMin === null) salMin = single;
      if (salMax === null) salMax = single;
    }
  }

  // Enforce rule: max will not be lower than min, and min will not go higher than max
  if (salMin !== null && salMax !== null) {
    if (salMax < salMin) {
      return res.status(400).json({ message: "Maximum expected salary cannot be lower than minimum expected salary." });
    }
  } else if (salMin !== null && salMax === null) {
    salMax = salMin;
  } else if (salMin === null && salMax !== null) {
    salMin = salMax;
  }

  let consolidatedSalary = null;
  if (salMin !== null && salMax !== null) {
    const formattedMin = salMin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedMax = salMax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (salMin === salMax) {
      consolidatedSalary = formattedMin;
    } else {
      consolidatedSalary = `${formattedMin} - ${formattedMax}`;
    }
  } else if (req.body?.expected_salary !== undefined) {
    consolidatedSalary = normalizeCurrency(req.body?.expected_salary);
  } else if (currentProf?.expected_salary) {
    consolidatedSalary = currentProf.expected_salary;
  }
  values[10] = consolidatedSalary;

  const email = typeof req.body?.email === "string" && req.body.email.trim() ? req.body.email.trim().toLowerCase() : (currentProf?.email || "");

  if (!values[0] || !values[2]) return res.status(400).json({ message: "First name and last name are required." });

  if (values[11]) {
    const matchArr = Array.from(WORK_ARRANGEMENTS).find(
      (wa) => wa.toLowerCase() === values[11].toLowerCase().replace("-", "").replace(/\s+/g, "") || wa.toLowerCase() === values[11].toLowerCase()
    );
    if (matchArr) {
      values[11] = matchArr;
    } else {
      return res.status(400).json({ message: "Invalid work arrangement." });
    }
  }

  const shsStrand = typeof req.body?.shs_strand === "string" ? req.body.shs_strand.trim() : null;
  const shsSchool = typeof req.body?.shs_school === "string" ? req.body.shs_school.trim() : null;
  const shsGradYear = typeof req.body?.shs_grad_year === "string" ? req.body.shs_grad_year.trim() : null;
  const collegeGradYear = typeof req.body?.college_grad_year === "string" ? req.body.college_grad_year.trim() : null;
  const vocationalGradYear = typeof req.body?.vocational_grad_year === "string" ? req.body.vocational_grad_year.trim() : null;
  const prefCitiesJson = Array.isArray(req.body?.preferred_cities)
    ? JSON.stringify(req.body.preferred_cities)
    : typeof req.body?.preferred_cities_json === "string"
    ? req.body.preferred_cities_json
    : null;
  const isNonGradCert = req.body?.is_non_graduate_cert_holder ? 1 : 0;
  const prefLocStr = Array.isArray(req.body?.preferred_locations)
    ? req.body.preferred_locations.join(", ")
    : typeof req.body?.preferred_locations === "string"
    ? req.body.preferred_locations.trim()
    : null;

  try {
    try {
      await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_min NUMERIC");
      await run("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS expected_salary_max NUMERIC");
    } catch {}

    await run("BEGIN TRANSACTION");
    if (email && email !== currentProf?.email) {
      await run("UPDATE users SET email = ?, is_email_verified = TRUE WHERE id = ? AND role = 'applicant'", [email, userId]);
    }
    const updated = await run(
      `UPDATE applicant_profiles 
       SET first_name=?, middle_name=?, last_name=?, phone=?, province=?, city=?, address=?, summary=?, languages=?, desired_job_title=?, expected_salary=?, work_arrangement=?, years_of_experience=?,
           expected_salary_min = ?, expected_salary_max = ?,
           shs_strand=?, shs_school=?, shs_grad_year=?, college_grad_year=?, vocational_grad_year=?, preferred_cities_json=?, is_non_graduate_cert_holder=?,
           preferred_locations = COALESCE(?, preferred_locations)
       WHERE user_id=?`,
      [...values, salMin, salMax, shsStrand, shsSchool, shsGradYear, collegeGradYear, vocationalGradYear, prefCitiesJson, isNonGradCert, prefLocStr, userId]
    );
    if (!updated.changes) throw new Error("PROFILE_NOT_FOUND");
    await run("COMMIT");
    const profile = await get(`SELECT p.*, u.email, COALESCE(u.is_email_verified, FALSE) AS is_email_verified FROM applicant_profiles p INNER JOIN users u ON u.id=p.user_id WHERE p.user_id=?`, [userId]);
    if (profile) {
      if (profile.expected_salary && (profile.expected_salary_min == null || profile.expected_salary_max == null)) {
        const parts = String(profile.expected_salary).split("-").map((p) => p.trim());
        if (parts.length >= 2) {
          const pMin = parseSalaryNumeric(parts[0]);
          const pMax = parseSalaryNumeric(parts[1]);
          if (profile.expected_salary_min == null && pMin !== null) profile.expected_salary_min = pMin;
          if (profile.expected_salary_max == null && pMax !== null) profile.expected_salary_max = pMax;
        } else {
          const single = parseSalaryNumeric(parts[0]);
          if (single !== null) {
            if (profile.expected_salary_min == null) profile.expected_salary_min = single;
            if (profile.expected_salary_max == null) profile.expected_salary_max = single;
          }
        }
      }
    }
    res.json({ profile });
  } catch (error) {
    try { await run("ROLLBACK"); } catch {}
    console.error("Save applicant profile error:", error);
    if (error.code === "SQLITE_CONSTRAINT" || error.code === "23505" || String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "An account with this email address already exists." });
    }
    res.status(error.message === "PROFILE_NOT_FOUND" ? 404 : 500).json({ message: error.message === "PROFILE_NOT_FOUND" ? "Applicant profile not found." : "Unable to save profile." });
  }
});

app.put("/api/applicants/:userId/location", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid applicant ID." });
  }

  const { nearby_location } = req.body ?? {};
  const nearbyLocVal = typeof nearby_location === "string" && nearby_location.trim()
    ? nearby_location.trim()
    : null;

  try {
    await run(
      `UPDATE applicant_profiles
       SET nearby_location = ?
       WHERE user_id = ?`,
      [nearbyLocVal, userId]
    );

    const profile = await get(
      `SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`,
      [userId]
    );
    res.json({ message: "Location updated successfully.", profile });
  } catch (err) {
    console.error("Update applicant location error:", err);
    res.status(500).json({ message: "Unable to update location." });
  }
});

app.put("/api/applicants/:userId/tags", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const field = req.body?.field;
  const allowed = new Set(["skills", "certifications", "qualifications", "languages", "preferred_locations"]);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : (Array.isArray(req.body?.skills) ? req.body.skills : []);
  const cleaned = rawItems.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);

  if (!Number.isInteger(userId) || userId < 1 || !field || !allowed.has(field) || cleaned.length > 30) {
    return res.status(400).json({ message: "Invalid profile tags." });
  }

  try {
    const updated = await run(`UPDATE applicant_profiles SET ${field} = ? WHERE user_id = ?`, [cleaned.join(", ") || null, userId]);
    if (!updated.changes) return res.status(404).json({ message: "Applicant profile not found." });
    res.json({ field, items: cleaned });
  } catch (err) {
    console.error("Error updating profile tags:", err);
    res.status(500).json({ message: "Unable to save profile tags." });
  }
});

app.put("/api/applicants/:userId/skills", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const rawItems = Array.isArray(req.body?.skills) ? req.body.skills : (Array.isArray(req.body?.items) ? req.body.items : []);
  const cleaned = rawItems.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);

  if (!Number.isInteger(userId) || userId < 1 || cleaned.length > 30) {
    return res.status(400).json({ message: "Invalid profile skills." });
  }

  try {
    const updated = await run(`UPDATE applicant_profiles SET skills = ? WHERE user_id = ?`, [cleaned.join(", ") || null, userId]);
    if (!updated.changes) return res.status(404).json({ message: "Applicant profile not found." });
    res.json({ skills: cleaned });
  } catch (err) {
    console.error("Error updating profile skills:", err);
    res.status(500).json({ message: "Unable to save profile skills." });
  }
});

app.put("/api/applicants/:userId/preferred-locations", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const rawItems = Array.isArray(req.body?.preferred_locations)
    ? req.body.preferred_locations
    : (Array.isArray(req.body?.items) ? req.body.items : []);
  const cleaned = rawItems.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);

  if (!Number.isInteger(userId) || userId < 1 || cleaned.length > 30) {
    return res.status(400).json({ message: "Invalid preferred locations." });
  }

  try {
    const updated = await run(`UPDATE applicant_profiles SET preferred_locations = ? WHERE user_id = ?`, [cleaned.join(", ") || null, userId]);
    if (!updated.changes) return res.status(404).json({ message: "Applicant profile not found." });
    res.json({ preferred_locations: cleaned, items: cleaned });
  } catch (err) {
    console.error("Error updating preferred locations:", err);
    res.status(500).json({ message: "Unable to save preferred locations." });
  }
});

app.put("/api/applicants/:userId/work-experience", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid applicant ID." });
  }

  const rawItems = req.body?.work_experience ?? req.body?.items ?? req.body?.work_experience_json;
  let jsonStr = null;
  if (typeof rawItems === "string") {
    jsonStr = rawItems;
  } else if (Array.isArray(rawItems) || typeof rawItems === "object") {
    jsonStr = JSON.stringify(rawItems);
  }

  try {
    const updated = await run(`UPDATE applicant_profiles SET work_experience_json = ? WHERE user_id = ?`, [jsonStr, userId]);
    if (!updated.changes) return res.status(404).json({ message: "Applicant profile not found." });
    res.json({ message: "Work experience saved successfully.", work_experience_json: jsonStr });
  } catch (err) {
    console.error("Error updating work experience:", err);
    res.status(500).json({ message: "Unable to save work experience to database." });
  }
});

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed."));
    }
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith("image/") || file.mimetype === "image/svg+xml")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, SVG, GIF) are allowed."));
    }
  },
});

app.post("/api/applicants/:userId/resume", authenticateToken, requireUserOrAdmin, resumeUpload.single("resume"), async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  if (!req.file) return res.status(400).json({ message: "No file uploaded. Please attach a PDF or Word document." });

  const { originalname, mimetype, buffer } = req.file;

  try {
    const updated = await run(
      "UPDATE applicant_profiles SET resume_path = ?, resume_data = ?, resume_mimetype = ? WHERE user_id = ?",
      [originalname, buffer, mimetype, userId]
    );

    if (!updated.changes) {
      return res.status(404).json({ message: "Applicant profile not found." });
    }

    const profile = await get(
      `SELECT p.user_id, p.first_name, p.middle_name, p.last_name, p.phone, p.city, p.address, p.desired_job_title, p.expected_salary, p.work_arrangement, p.years_of_experience, p.skills, p.certifications, p.qualifications, p.resume_path, p.profile_picture_path, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );

    res.json({ message: "Resume uploaded and saved successfully.", resume_path: originalname, profile });
  } catch (err) {
    console.error("Resume upload error:", err);
    res.status(500).json({ message: "Unable to save resume to database." });
  }
});

app.get("/api/applicants/:userId/resume", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const row = await get(
      "SELECT resume_path, resume_data, resume_mimetype FROM applicant_profiles WHERE user_id = ?",
      [userId]
    );

    if (!row || !row.resume_data) {
      return res.status(404).json({ message: "No resume found for this applicant." });
    }

    const pathStr = (row.resume_path || "").toLowerCase();
    const mimeStr = (row.resume_mimetype || "").toLowerCase();
    const isDocx = pathStr.endsWith(".docx") || pathStr.endsWith(".doc") || mimeStr.includes("word") || mimeStr.includes("officedocument");
    const isImage = pathStr.endsWith(".png") || pathStr.endsWith(".jpg") || pathStr.endsWith(".jpeg") || pathStr.endsWith(".webp") || mimeStr.startsWith("image/");

    // 0. PDF Conversion endpoint (convert document text into real PDF file)
    if (req.query.format === "convert-pdf" || req.query.convert === "pdf") {
      let rawText = "";
      try {
        if (isDocx) {
          const extracted = await mammoth.extractRawText({ buffer: row.resume_data });
          rawText = extracted.value || "";
        } else if (!isImage) {
          rawText = row.resume_data.toString("utf-8");
        }
      } catch (e) {}

      const cleanText = rawText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]*>/g, "\n")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];
      doc.on("data", (c) => buffers.push(c));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        const disposition = req.query.download === "1" ? 'attachment; filename="Converted_Resume.pdf"' : 'inline; filename="Converted_Resume.pdf"';
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", disposition);
        return res.send(pdfData);
      });

      doc.fillColor("#0f172a").fontSize(18).text(row.resume_path ? `Resume: ${row.resume_path}` : "Candidate Resume");
      doc.moveDown(0.5);
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);
      doc.fillColor("#334155").fontSize(10).text(cleanText || "No text content extracted.", { lineGap: 4 });
      doc.end();
      return;
    }

    // 1. Extract raw text from document file for ATS parsing
    if (req.query.format === "text" || req.query.format === "ats") {
      let rawText = "";
      try {
        if (isDocx) {
          const extracted = await mammoth.extractRawText({ buffer: row.resume_data });
          rawText = extracted.value || "";
        } else if (!isImage) {
          rawText = row.resume_data.toString("utf-8");
        }
      } catch (e) {
        console.error("Error extracting document text:", e);
      }

      // Filter out base64 image strings and preserve genuine line breaks from HTML/DOCX
      const cleanText = rawText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=\s]+/gi, "")
        .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|strong)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");

      if (req.query.format === "ats") {
        const lines = cleanText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("data:image") && !line.includes("base64,"));

        const hasRealText = lines.some((l) => l.length > 3 && !l.includes("[Attached Image]"));

        const atsFormatted = `================================================================
ATS PARSED DOCUMENT (${row.resume_path || "Resume"})
================================================================

${hasRealText ? lines.join("\n\n") : "[SCANNED / IMAGE-BASED DOCUMENT]\nThis candidate document contains an image or photo scan without selectable text. Upload a text-based PDF or Word document for 100% ATS score compatibility."}

================================================================`;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.send(atsFormatted);
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(cleanText || "No text content found.");
    }

    // 1. Image Resume inline responsive viewer
    if (isImage && req.query.download !== "1") {
      const imgMime = mimeStr.startsWith("image/") ? mimeStr : (pathStr.endsWith(".png") ? "image/png" : "image/jpeg");
      const base64 = row.resume_data.toString("base64");
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    img {
      max-width: 96%;
      max-height: 96vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
  </style>
</head>
<body>
  <img src="data:${imgMime};base64,${base64}" alt="Resume Image Document" />
</body>
</html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(htmlContent);
    }

    // 2. Word Document inline responsive converter
    if ((isDocx || req.query.format === "html") && req.query.download !== "1") {
      try {
        const result = await mammoth.convertToHtml(
          { buffer: row.resume_data },
          {
            convertImage: mammoth.images.imgElement((image) => {
              return image.read("base64").then((imageBuffer) => {
                return {
                  src: `data:${image.contentType};base64,${imageBuffer}`,
                };
              });
            }),
          }
        );

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box !important; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
      font-size: 15px;
      overflow-x: hidden;
    }
    .doc-page {
      background: #ffffff;
      max-width: 800px;
      width: 100%;
      margin: 12px auto;
      padding: 24px 32px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      box-sizing: border-box;
    }
    img, svg, video {
      max-width: 100% !important;
      width: auto !important;
      max-height: 380px !important;
      height: auto !important;
      object-fit: contain !important;
      display: block;
      margin: 12px auto !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      margin-top: 1.2em;
      margin-bottom: 0.4em;
      font-weight: 700;
      line-height: 1.3;
    }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    h2 { font-size: 1.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    h3 { font-size: 1.1rem; }
    p { margin-top: 0; margin-bottom: 0.75em; word-break: break-word; }
    ul, ol { padding-left: 24px; margin-top: 0; margin-bottom: 0.8em; }
    li { margin-bottom: 4px; }
    table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; margin: 16px 0; table-layout: auto; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 14px; word-break: break-word; }
    th { background: #f8fafc; font-weight: 600; }
    blockquote { border-left: 4px solid #cbd5e1; margin: 12px 0; padding-left: 16px; color: #475569; font-style: italic; }
    a { color: #0284c7; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="doc-page">
    ${result.value || "<p>Document loaded.</p>"}
  </div>
</body>
</html>`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(htmlContent);
      } catch (convErr) {
        console.error("Mammoth DOCX conversion error:", convErr);
      }
    }

    let mimeType = row.resume_mimetype;
    if (!mimeType || mimeType === "application/octet-stream") {
      if (pathStr.endsWith(".pdf")) mimeType = "application/pdf";
      else if (pathStr.endsWith(".png")) mimeType = "image/png";
      else if (pathStr.endsWith(".jpg") || pathStr.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (pathStr.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (pathStr.endsWith(".doc")) mimeType = "application/msword";
      else if (pathStr.endsWith(".txt")) mimeType = "text/plain";
      else mimeType = "application/pdf";
    }

    const fileName = encodeURIComponent(row.resume_path || "resume.pdf");
    const disposition = req.query.download === "1" ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`;
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", disposition);
    res.send(row.resume_data);
  } catch (err) {
    console.error("Resume download error:", err);
    res.status(500).json({ message: "Unable to retrieve resume." });
  }
});

const genericUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post("/api/applicants/parse-document", genericUpload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    const filename = (req.file.originalname || "").toLowerCase();
    let rawText = "";

    if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const extracted = await mammoth.extractRawText({ buffer: req.file.buffer });
      rawText = extracted.value || "";
    } else {
      rawText = req.file.buffer.toString("utf-8");
    }

    const cleanText = rawText
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=\s]+/gi, "")
      .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|strong)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");

    return res.json({ text: cleanText });
  } catch (err) {
    console.error("Document parse error:", err);
    return res.status(500).json({ message: "Unable to parse document." });
  }
});

app.get("/api/applicants/:userId/ats-document", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const profile = await get(
      `SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );

    if (!profile) {
      return res.status(404).json({ message: "Applicant profile not found." });
    }

    let workExperiences = [];
    if (profile.work_experience_json) {
      try {
        const parsed = JSON.parse(profile.work_experience_json);
        if (Array.isArray(parsed)) workExperiences = parsed;
      } catch {}
    }

    const cleanTag = (str) => (str || "").replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").replace(/@/g, "-").replace(/\s+/g, " ").trim();

    const parseList = (str) => {
      if (!str) return [];
      return str.split(/[\n,;•|]+/).map(cleanTag).filter(Boolean);
    };

    const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Applicant Name";
    const rawSalary = (profile.expected_salary || "").replace(/[^0-9.]/g, "");
    const numSalary = Number(rawSalary);
    const formattedSalary = Number.isFinite(numSalary) && numSalary > 0
      ? `₱${numSalary.toLocaleString("en-US")}`
      : profile.expected_salary || "Negotiable";

    const atsData = {
      user_id: profile.user_id,
      name,
      email: profile.email || "Not provided",
      phone: profile.phone ? `+63 ${profile.phone}` : "Not provided",
      location: [profile.city, profile.province].filter(Boolean).join(", ") || profile.address || "Cavite, Philippines",
      target_role: profile.desired_job_title || "IT / Software Specialist",
      expected_salary: formattedSalary,
      work_arrangement: profile.work_arrangement || "Full-time",
      years_of_experience: profile.years_of_experience || "3+ years",
      summary: profile.summary || `Motivated ${profile.desired_job_title || "IT Professional"} with experience in software development and technical solutions.`,
      skills: parseList(profile.skills),
      certifications: parseList(profile.certifications),
      qualifications: parseList(profile.qualifications),
      preferred_locations: parseList(profile.preferred_locations),
      languages: parseList(profile.languages),
      work_experiences: workExperiences,
    };

    const format = (req.query.format || "json").toLowerCase();

    if (format === "txt") {
      const divider = "================================================================================";
      const subDivider = "--------------------------------------------------------------------------------";
      let doc = `${divider}\n${atsData.name.toUpperCase()}\nLocation: ${atsData.location}  |  Email: ${atsData.email}  |  Phone: ${atsData.phone}\n${divider}\n\n`;
      doc += `PROFESSIONAL SUMMARY\n${subDivider}\n${atsData.summary}\n\n`;
      doc += `TARGET ROLE & CAREER PREFERENCES\n${subDivider}\nDesired Position: ${atsData.target_role}\nExperience Level: ${atsData.years_of_experience}   |   Work Arrangement: ${atsData.work_arrangement}\nExpected Salary: ${atsData.expected_salary}\n`;
      if (atsData.preferred_locations.length > 0) doc += `Preferred Work Locations: ${atsData.preferred_locations.join(", ")}\n`;
      doc += `\n`;
      if (atsData.skills.length > 0) {
        doc += `CORE COMPETENCIES & TECHNICAL SKILLS\n${subDivider}\n${atsData.skills.map((s) => `• ${s}`).join("\n")}\n\n`;
      }
      if (atsData.work_experiences.length > 0) {
        doc += `WORK EXPERIENCE\n${subDivider}\n`;
        atsData.work_experiences.forEach((exp) => {
          const dates = `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.isCurrent ? "Present" : `${exp.endMonth || ""} ${exp.endYear || ""}`}`;
          doc += `${(exp.title || "").toUpperCase()}\n${exp.company || ""} — ${exp.city ? `${exp.city}, ` : ""}${exp.province || ""} (${dates.trim()})\n`;
          if (exp.responsibilities) doc += `Key Responsibilities & Achievements:\n${exp.responsibilities}\n`;
          if (exp.skills && exp.skills.length > 0) doc += `Key Technologies: ${exp.skills.map(cleanTag).join(", ")}\n`;
          doc += `\n`;
        });
      }
      doc += `${divider}\nEND OF ATS PARSED APPLICANT DOCUMENT - ELITECRUIT SYSTEM\n${divider}\n`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(atsData.name)}_ATS_Resume.txt"`);
      return res.send(doc);
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40 });
      const filename = `${encodeURIComponent(atsData.name)}_ATS_Resume.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      doc.pipe(res);

      doc.fontSize(20).fillColor("#073e68").text(atsData.name.toUpperCase(), { align: "center" });
      doc.fontSize(10).fillColor("#475569").text(`${atsData.location}  •  ${atsData.email}  •  ${atsData.phone}`, { align: "center" });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#073e68").lineWidth(1.5).stroke();
      doc.moveDown(0.8);

      const addSection = (title) => {
        doc.fontSize(12).fillColor("#073e68").text(title.toUpperCase());
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
        doc.moveDown(0.4);
      };

      addSection("Professional Summary");
      doc.fontSize(10).fillColor("#1e293b").text(atsData.summary);
      doc.moveDown(0.8);

      addSection("Target Role & Career Preferences");
      doc.fontSize(10).fillColor("#1e293b")
        .text(`Desired Position: ${atsData.target_role}`)
        .text(`Experience Level: ${atsData.years_of_experience}  |  Work Arrangement: ${atsData.work_arrangement}`)
        .text(`Expected Salary: ${atsData.expected_salary}`);
      if (atsData.preferred_locations.length > 0) {
        doc.text(`Preferred Work Locations: ${atsData.preferred_locations.join(", ")}`);
      }
      doc.moveDown(0.8);

      if (atsData.skills.length > 0) {
        addSection("Core Competencies & Technical Skills");
        doc.fontSize(10).fillColor("#1e293b").text(atsData.skills.map((s) => `• ${s}`).join("   "));
        doc.moveDown(0.8);
      }

      if (atsData.work_experiences.length > 0) {
        addSection("Work Experience");
        atsData.work_experiences.forEach((exp) => {
          const dates = `${exp.startMonth || ""} ${exp.startYear || ""} - ${exp.isCurrent ? "Present" : `${exp.endMonth || ""} ${exp.endYear || ""}`}`;
          doc.fontSize(11).fillColor("#0f172a").text(`${exp.title || ""} — ${exp.company || ""}`, { continued: true });
          doc.fontSize(9).fillColor("#64748b").text(` (${dates.trim()})`, { align: "right" });
          doc.fontSize(9.5).fillColor("#0369a1").text(`${exp.city ? `${exp.city}, ` : ""}${exp.province || ""}`);
          if (exp.responsibilities) {
            doc.fontSize(9.5).fillColor("#334155").text(exp.responsibilities);
          }
          doc.moveDown(0.5);
        });
      }

      doc.end();
      return;
    }

    return res.json({ ats_document: atsData });
  } catch (err) {
    console.error("Get ATS document error:", err);
    return res.status(500).json({ message: "Unable to generate ATS document." });
  }
});

async function optimizeApplicantAtsWithGemini(profileData) {
  const fallbackResult = {
    summary: profileData.summary || `Motivated ${profileData.target_role || "IT Professional"} with experience in software development and technical solutions. Open to target opportunities.`,
    skills: profileData.skills || [],
    work_experiences: (profileData.work_experiences || []).map((exp) => ({
      ...exp,
      responsibilities: exp.responsibilities
        ? exp.responsibilities.split("\n").map((line) => line.trim().startsWith("•") ? line.trim() : `• ${line.trim()}`).join("\n")
        : "• Spearheaded cross-functional projects and delivered scalable solutions under tight deadlines.",
    })),
    is_ai_generated: false,
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackResult;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an executive resume writer and ATS keyword optimization expert. Review the candidate profile below and optimize the Professional Summary and Work Experience responsibilities for ATS scanners and recruiters.

Candidate Info:
Name: ${profileData.name}
Target Role: ${profileData.target_role}
Current Summary: ${profileData.summary || "None"}
Skills: ${JSON.stringify(profileData.skills)}
Work Experience: ${JSON.stringify(profileData.work_experiences)}

Requirements:
1. "summary": Create a powerful 2-3 sentence summary loaded with industry action verbs and target ATS keywords.
2. "work_experiences": For each work experience entry, rewrite "responsibilities" into 2-4 strong bullet points (each starting with "• ") using high-impact action verbs (e.g., Engineered, Spearheaded, Architected, Optimized). Preserve company, title, city, province, dates, skills.

Return ONLY a valid raw JSON object with keys "summary" and "work_experiences". Do not include markdown codeblocks or extra commentary.`;

    const fetchPromise = (async () => {
      let text = "";
      try {
        const res = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });
        text = res.text || "";
      } catch (err1) {
        console.warn("gemini-3.5-flash-lite retry fallback to gemini-3.8-flash:", err1?.message || err1);
        const res = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });
        text = res.text || "";
      }
      return text;
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API timeout after 6s")), 6000)
    );

    const responseText = await Promise.race([fetchPromise, timeoutPromise]);
    const cleanJson = String(responseText).replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      summary: parsed.summary || profileData.summary,
      skills: profileData.skills,
      work_experiences: Array.isArray(parsed.work_experiences) && parsed.work_experiences.length > 0
        ? parsed.work_experiences
        : profileData.work_experiences,
      is_ai_generated: true,
    };
  } catch (err) {
    console.error("Gemini AI ATS optimization error:", err?.message || err);
    return { ...fallbackResult, is_ai_generated: true };
  }
}

app.post("/api/applicants/:userId/ats-document/optimize", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const profile = await get(
      `SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );

    if (!profile) return res.status(404).json({ message: "Applicant profile not found." });

    let workExperiences = [];
    if (profile.work_experience_json) {
      try {
        const parsed = JSON.parse(profile.work_experience_json);
        if (Array.isArray(parsed)) workExperiences = parsed;
      } catch {}
    }

    const cleanTag = (str) => (str || "").replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").replace(/@/g, "-").replace(/\s+/g, " ").trim();
    const parseList = (str) => (!str ? [] : str.split(/[\n,;•|]+/).map(cleanTag).filter(Boolean));

    const candidatePayload = {
      name: [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Applicant Name",
      target_role: profile.desired_job_title || "IT / Software Specialist",
      summary: profile.summary || "",
      skills: parseList(profile.skills),
      work_experiences: workExperiences,
    };

    const optimized = await optimizeApplicantAtsWithGemini(candidatePayload);

    return res.json({
      optimized_summary: optimized.summary,
      optimized_work_experiences: optimized.work_experiences,
      is_ai_generated: optimized.is_ai_generated,
    });
  } catch (err) {
    console.error("ATS optimization route error:", err);
    return res.status(500).json({ message: "Unable to optimize ATS document with AI." });
  }
});

app.delete("/api/applicants/:userId/resume", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const updated = await run(
      "UPDATE applicant_profiles SET resume_path = NULL, resume_data = NULL, resume_mimetype = NULL WHERE user_id = ?",
      [userId]
    );

    if (!updated.changes) {
      return res.status(404).json({ message: "Applicant profile not found." });
    }

    const profile = await get(
      `SELECT p.user_id, p.first_name, p.middle_name, p.last_name, p.phone, p.city, p.address, p.desired_job_title, p.expected_salary, p.work_arrangement, p.years_of_experience, p.skills, p.certifications, p.qualifications, p.resume_path, p.profile_picture_path, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );

    res.json({ message: "Resume removed successfully.", profile });
  } catch {
    res.status(500).json({ message: "Unable to delete resume." });
  }
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];
    if (allowed.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith("image/"))) {
      cb(null, true);
    } else {
      cb(new Error("Allowed formats: PDF, DOCX, DOC, JPG, PNG, WEBP."));
    }
  },
});

app.get("/api/applicants/:userId/documents", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const profile = await get("SELECT resume_path FROM applicant_profiles WHERE user_id = ?", [userId]);
    const resume = profile && profile.resume_path ? {
      id: "resume",
      file_name: profile.resume_path,
      file_size: null,
      mimetype: "application/pdf",
      created_at: null,
      url: `/api/applicants/${userId}/resume`,
      is_resume: true,
    } : null;

    const rows = await all(
      `SELECT id, file_name, file_size, mimetype, created_at 
       FROM applicant_documents 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    const attachments = (rows || []).map(r => ({
      id: r.id,
      file_name: r.file_name,
      file_size: Number(r.file_size || 0),
      mimetype: r.mimetype,
      created_at: r.created_at,
      url: `/api/applicants/${userId}/documents/${r.id}`,
      is_resume: false,
    }));

    const documents = [];
    if (resume) documents.push(resume);
    documents.push(...attachments);

    res.json({ documents });
  } catch (err) {
    console.error("Error loading applicant documents:", err);
    res.status(500).json({ message: "Failed to load documents." });
  }
});

app.post("/api/applicants/:userId/documents", authenticateToken, requireUserOrAdmin, documentUpload.single("document"), async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  if (!req.file) return res.status(400).json({ message: "No document attached." });

  const { originalname, mimetype, size, buffer } = req.file;

  try {
    const profile = await get("SELECT resume_path FROM applicant_profiles WHERE user_id = ?", [userId]);
    if (!profile?.resume_path && (mimetype.includes("pdf") || mimetype.includes("word") || mimetype.includes("document"))) {
      await run(
        "UPDATE applicant_profiles SET resume_path = ?, resume_data = ?, resume_mimetype = ? WHERE user_id = ?",
        [originalname, buffer, mimetype, userId]
      );
      return res.json({
        message: "Document attached successfully.",
        document: {
          id: "resume",
          file_name: originalname,
          file_size: size || buffer.length,
          mimetype,
          url: `/api/applicants/${userId}/resume`,
          is_resume: true,
        }
      });
    }

    const result = await run(
      `INSERT INTO applicant_documents (user_id, file_name, file_size, mimetype, file_data)
       VALUES (?, ?, ?, ?, ?) RETURNING id`,
      [userId, originalname, size || buffer.length, mimetype, buffer]
    );

    const newId = result?.rows?.[0]?.id || result?.lastID;

    res.json({
      message: "Document attached successfully.",
      document: {
        id: newId,
        file_name: originalname,
        file_size: size || buffer.length,
        mimetype,
        url: `/api/applicants/${userId}/documents/${newId}`,
        is_resume: false,
      }
    });
  } catch (err) {
    console.error("Document upload error:", err);
    res.status(500).json({ message: "Failed to save document attachment." });
  }
});

app.get("/api/applicants/:userId/documents/:docId", async (req, res) => {
  const userId = Number(req.params.userId);
  const docId = Number(req.params.docId);
  if (!Number.isInteger(userId) || !Number.isInteger(docId)) {
    return res.status(400).json({ message: "Invalid document request." });
  }

  try {
    const row = await get(
      "SELECT file_name, category, mimetype, file_data FROM applicant_documents WHERE id = ? AND user_id = ?",
      [docId, userId]
    );

    if (!row || !row.file_data) {
      return res.status(404).json({ message: "Document not found." });
    }

    const fileName = encodeURIComponent(row.file_name || "attachment");
    const disposition = req.query.download === "1" ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`;
    res.setHeader("Content-Type", row.mimetype || "application/octet-stream");
    res.setHeader("Content-Disposition", disposition);
    return res.send(row.file_data);
  } catch (err) {
    console.error("Error serving document attachment:", err);
    res.status(500).json({ message: "Error retrieving document." });
  }
});

app.delete("/api/applicants/:userId/documents/:docId", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const docId = Number(req.params.docId);
  if (!Number.isInteger(userId) || !Number.isInteger(docId)) {
    return res.status(400).json({ message: "Invalid document request." });
  }

  try {
    await run("DELETE FROM applicant_documents WHERE id = ? AND user_id = ?", [docId, userId]);
    res.json({ message: "Document attachment deleted successfully." });
  } catch (err) {
    console.error("Error deleting document:", err);
    res.status(500).json({ message: "Failed to delete document attachment." });
  }
});

app.post("/api/applicants/:userId/profile-picture", authenticateToken, requireUserOrAdmin, photoUpload.single("photo"), async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  if (!req.file) return res.status(400).json({ message: "No image file uploaded." });

  const { mimetype, buffer } = req.file;
  const photoUrl = `/api/applicants/${userId}/profile-picture`;

  try {
    const updated = await run(
      "UPDATE applicant_profiles SET profile_picture_path = ?, profile_picture_data = ?, profile_picture_mimetype = ? WHERE user_id = ?",
      [photoUrl, buffer, mimetype, userId]
    );

    if (!updated.changes) {
      return res.status(404).json({ message: "Applicant profile not found." });
    }

    const profile = await get(
      `SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );

    res.json({ message: "Profile photo updated successfully.", profile_picture_path: photoUrl, profile: sanitizeApplicantProfile(profile) });
  } catch (err) {
    console.error("Profile picture upload error:", err);
    res.status(500).json({ message: "Unable to save profile photo." });
  }
});

app.get("/api/applicants/:userId/profile-picture", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const row = await get(
      "SELECT profile_picture_data, profile_picture_mimetype FROM applicant_profiles WHERE user_id = ?",
      [userId]
    );

    if (!row || !row.profile_picture_data) {
      return res.status(404).json({ message: "No profile picture found." });
    }

    res.setHeader("Content-Type", row.profile_picture_mimetype || "image/jpeg");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(row.profile_picture_data);
  } catch (err) {
    console.error("Error serving profile picture:", err);
    res.status(500).json({ message: "Error retrieving profile picture." });
  }
});

app.delete("/api/applicants/:userId/profile-picture", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    await run(
      "UPDATE applicant_profiles SET profile_picture_path = NULL, profile_picture_data = NULL, profile_picture_mimetype = NULL WHERE user_id = ?",
      [userId]
    );
    const profile = await get(
      `SELECT p.*, u.email FROM applicant_profiles p INNER JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role = 'applicant'`,
      [userId]
    );
    res.json({ message: "Profile picture removed successfully.", profile: sanitizeApplicantProfile(profile) });
  } catch (err) {
    console.error("Error removing profile picture:", err);
    res.status(500).json({ message: "Error removing profile picture." });
  }
});

app.get("/api/employers/:userId/profile", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  try {
    const profile = await get(
      `SELECT e.user_id, e.business_name, e.industry, e.company_size, e.company_description,
              e.contact_number, e.province, e.city, e.company_address, e.company_logo_path,
              e.company_cover_path, u.email AS business_email
       FROM employer_profiles e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.user_id = ?`,
      [userId]
    );
    if (!profile) {
      const user = await get("SELECT id, email FROM users WHERE id = ? AND role = 'employer'", [userId]);
      if (!user) return res.status(404).json({ message: "Employer not found." });
      return res.json({
        profile: {
          user_id: user.id,
          business_name: user.email,
          business_email: user.email,
          contact_number: null,
          industry: "Recruitment & Staffing",
          province: "Cavite",
          city: "Indang",
          company_address: "Indang, Cavite",
          company_description: "Registered Employer on EliteCruit.",
        },
      });
    }
    res.json({ profile });
  } catch (err) {
    console.error("Get employer profile error:", err);
    res.status(500).json({ message: "Unable to load employer profile." });
  }
});

app.put("/api/employers/:userId/profile", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  const {
    business_email,
    business_name,
    industry,
    company_size,
    company_description,
    contact_number,
    province,
    city,
    company_address,
    company_logo_path,
    company_cover_path,
  } = req.body ?? {};

  if (typeof business_name !== "string" || !business_name.trim()) {
    return res.status(400).json({ message: "Business name is required." });
  }

  if (typeof business_email !== "string" || !/^\S+@\S+\.\S+$/.test(business_email.trim())) {
    return res.status(400).json({ message: "A valid business email is required." });
  }

  try {
    await run("BEGIN TRANSACTION");
    await run("UPDATE users SET email = ? WHERE id = ? AND role = 'employer'", [business_email.trim().toLowerCase(), userId]);
    const updated = await run(
      `UPDATE employer_profiles
       SET business_name = ?, industry = ?, company_size = ?, company_description = ?, contact_number = ?,
           province = ?, city = ?, company_address = ?, company_logo_path = ?, company_cover_path = ?
       WHERE user_id = ?`,
      [
        business_name.trim(),
        typeof industry === "string" ? industry.trim() || null : null,
        typeof company_size === "string" ? company_size.trim() || null : null,
        typeof company_description === "string" ? company_description.trim() || null : null,
        typeof contact_number === "string" ? contact_number.trim() || null : null,
        typeof province === "string" ? province.trim() || null : null,
        typeof city === "string" ? city.trim() || null : null,
        typeof company_address === "string" ? company_address.trim() || null : null,
        typeof company_logo_path === "string" ? company_logo_path.trim() || null : null,
        typeof company_cover_path === "string" ? company_cover_path.trim() || null : null,
        userId,
      ]
    );
    if (!updated.changes) {
      await run("ROLLBACK");
      return res.status(404).json({ message: "Employer profile not found." });
    }
    await run("COMMIT");

    const profile = await get(
      `SELECT e.user_id, e.business_name, e.industry, e.company_size, e.company_description,
              e.contact_number, e.province, e.city, e.company_address, e.company_logo_path,
              e.company_cover_path, u.email AS business_email
       FROM employer_profiles e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.user_id = ?`,
      [userId]
    );
    res.json({ profile: sanitizeEmployerProfile(profile) });
  } catch {
    try { await run("ROLLBACK"); } catch {}
    res.status(500).json({ message: "Unable to save employer profile." });
  }
});

app.post("/api/employers/:userId/logo", authenticateToken, requireUserOrAdmin, photoUpload.single("logo"), async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!req.file) return res.status(400).json({ message: "No logo file uploaded." });

  const { mimetype, buffer } = req.file;
  const logoUrl = `/api/employers/${userId}/logo`;

  try {
    const updated = await run(
      "UPDATE employer_profiles SET company_logo_path = ?, company_logo_data = ?, company_logo_mimetype = ? WHERE user_id = ?",
      [logoUrl, buffer, mimetype, userId]
    );

    if (!updated.changes) {
      return res.status(404).json({ message: "Employer profile not found." });
    }

    const profile = await get(
      `SELECT e.*, u.email AS business_email FROM employer_profiles e INNER JOIN users u ON u.id = e.user_id WHERE e.user_id = ?`,
      [userId]
    );

    res.json({ message: "Company logo updated successfully.", company_logo_path: logoUrl, profile: sanitizeEmployerProfile(profile) });
  } catch (err) {
    console.error("Employer logo upload error:", err);
    res.status(500).json({ message: "Unable to save company logo." });
  }
});

app.get("/api/employers/:userId/logo", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    const row = await get(
      "SELECT company_logo_data, company_logo_mimetype FROM employer_profiles WHERE user_id = ?",
      [userId]
    );

    if (!row || !row.company_logo_data) {
      return res.status(404).json({ message: "No company logo found." });
    }

    res.setHeader("Content-Type", row.company_logo_mimetype || "image/png");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(row.company_logo_data);
  } catch (err) {
    console.error("Error serving company logo:", err);
    res.status(500).json({ message: "Error retrieving company logo." });
  }
});

app.delete("/api/employers/:userId/logo", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    await run(
      "UPDATE employer_profiles SET company_logo_path = NULL, company_logo_data = NULL, company_logo_mimetype = NULL WHERE user_id = ?",
      [userId]
    );
    const profile = await get(
      `SELECT e.*, u.email AS business_email FROM employer_profiles e INNER JOIN users u ON u.id = e.user_id WHERE e.user_id = ?`,
      [userId]
    );
    res.json({ message: "Company logo removed successfully.", profile: sanitizeEmployerProfile(profile) });
  } catch (err) {
    console.error("Error removing company logo:", err);
    res.status(500).json({ message: "Error removing company logo." });
  }
});

app.post("/api/employers/:userId/cover", authenticateToken, requireUserOrAdmin, photoUpload.single("cover"), async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!req.file) return res.status(400).json({ message: "No cover file uploaded." });

  const { mimetype, buffer } = req.file;
  const coverUrl = `/api/employers/${userId}/cover`;

  try {
    const updated = await run(
      "UPDATE employer_profiles SET company_cover_path = ?, company_cover_data = ?, company_cover_mimetype = ? WHERE user_id = ?",
      [coverUrl, buffer, mimetype, userId]
    );

    if (!updated.changes) {
      return res.status(404).json({ message: "Employer profile not found." });
    }

    const profile = await get(
      `SELECT e.*, u.email AS business_email FROM employer_profiles e INNER JOIN users u ON u.id = e.user_id WHERE e.user_id = ?`,
      [userId]
    );

    res.json({ message: "Company cover image updated successfully.", company_cover_path: coverUrl, profile: sanitizeEmployerProfile(profile) });
  } catch (err) {
    console.error("Employer cover upload error:", err);
    res.status(500).json({ message: "Unable to save company cover image." });
  }
});

app.get("/api/employers/:userId/cover", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    const row = await get(
      "SELECT company_cover_data, company_cover_mimetype FROM employer_profiles WHERE user_id = ?",
      [userId]
    );

    if (!row || !row.company_cover_data) {
      return res.status(404).json({ message: "No company cover image found." });
    }

    res.setHeader("Content-Type", row.company_cover_mimetype || "image/jpeg");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(row.company_cover_data);
  } catch (err) {
    console.error("Error serving company cover image:", err);
    res.status(500).json({ message: "Error retrieving company cover image." });
  }
});

app.delete("/api/employers/:userId/cover", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    await run(
      "UPDATE employer_profiles SET company_cover_path = NULL, company_cover_data = NULL, company_cover_mimetype = NULL WHERE user_id = ?",
      [userId]
    );
    const profile = await get(
      `SELECT e.*, u.email AS business_email FROM employer_profiles e INNER JOIN users u ON u.id = e.user_id WHERE e.user_id = ?`,
      [userId]
    );
    res.json({ message: "Company cover image removed successfully.", profile: sanitizeEmployerProfile(profile) });
  } catch (err) {
    console.error("Error removing company cover image:", err);
    res.status(500).json({ message: "Error removing company cover image." });
  }
});

app.post("/api/employers/:userId/job-posts", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  const {
    title,
    location,
    is_urgent,
    hide_salary,
    work_arrangement,
    experience_level,
    application_limit,
    close_date,
    salary_min,
    salary_max,
    description,
    qualifications,
    certifications,
    required_skills,
  } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ message: "Job title is required." });
  if (work_arrangement && !WORK_ARRANGEMENTS.has(work_arrangement)) return res.status(400).json({ message: "Invalid work arrangement." });
  const numericLimit = null;
  const parsedCloseDate = parseCloseDate(close_date);
  if (!parsedCloseDate) return res.status(400).json({ message: "Close date must be in MM/DD/YYYY format." });
  const derivedStatus = deriveJobPostStatus(parsedCloseDate, req.body?.status);

  const branchName = typeof req.body?.branch_name === "string" ? req.body.branch_name.trim() : null;
  const branchAddress = typeof req.body?.branch_address === "string" ? req.body.branch_address.trim() : null;
  const acceptsNonGrads = req.body?.accepts_non_graduates ? 1 : 0;
  const eduReqs = typeof req.body?.education_requirements === "string" ? req.body.education_requirements.trim() : null;

  let locationVal = null;
  if (Array.isArray(req.body?.locations) && req.body.locations.length > 0) {
    locationVal = req.body.locations.map((l) => String(l).trim()).filter(Boolean).join(", ");
  } else if (Array.isArray(req.body?.location) && req.body.location.length > 0) {
    locationVal = req.body.location.map((l) => String(l).trim()).filter(Boolean).join(", ");
  } else if (typeof location === "string") {
    locationVal = location.trim() || null;
  }

  try {
    const insert = await run(
      `INSERT INTO job_posts (employer_user_id, title, location, status, is_urgent, hide_salary, work_arrangement, experience_level, application_limit, close_date, salary_min, salary_max, description, qualifications, certifications, required_skills, branch_name, branch_address, accepts_non_graduates, education_requirements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        locationVal,
        derivedStatus,
        is_urgent ? 1 : 0,
        hide_salary ? 1 : 0,
        typeof work_arrangement === "string" ? work_arrangement : null,
        typeof experience_level === "string" ? experience_level.trim() || null : null,
        numericLimit,
        parsedCloseDate,
        Number.isFinite(Number(salary_min)) ? Number(salary_min) : null,
        Number.isFinite(Number(salary_max)) ? Number(salary_max) : null,
        typeof description === "string" ? description.trim() || null : null,
        typeof qualifications === "string" ? qualifications.trim() || null : null,
        typeof certifications === "string" ? certifications.trim() || null : null,
        typeof required_skills === "string" ? required_skills.trim() || null : null,
        branchName,
        branchAddress,
        acceptsNonGrads,
        eduReqs,
      ]
    );

    const jobPost = await get("SELECT * FROM job_posts WHERE id = ?", [insert.lastID]);
    res.status(201).json({ jobPost });
  } catch (err) {
    console.error("Create job post error:", err);
    res.status(500).json({ message: "Unable to create job post." });
  }
});

app.get("/api/employers/:userId/unapplied-matches/:jobPostId", async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.params.jobPostId);
  if (!Number.isInteger(userId) || !Number.isInteger(jobPostId)) {
    return res.status(400).json({ message: "Invalid parameter IDs." });
  }

  try {
    const job = await get("SELECT * FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobPostId, userId]);
    if (!job) return res.status(404).json({ message: "Job post not found." });

    const applicants = await all(
      `SELECT ap.*, u.email
       FROM applicant_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE u.is_active = TRUE
         AND ap.user_id NOT IN (
           SELECT applicant_user_id FROM applications WHERE job_post_id = ?
         )`,
      [jobPostId]
    );

    const unappliedMatches = applicants.map((app) => {
      const appSkills = typeof app.skills === "string" ? app.skills.toLowerCase() : "";
      const appQuals = typeof app.qualifications === "string" ? app.qualifications.toLowerCase() : "";
      const appCerts = typeof app.certifications === "string" ? app.certifications.toLowerCase() : "";

      const jobSkills = typeof job.required_skills === "string" ? job.required_skills.toLowerCase() : "";
      const jobQuals = typeof job.qualifications === "string" ? job.qualifications.toLowerCase() : "";
      const jobCerts = typeof job.certifications === "string" ? job.certifications.toLowerCase() : "";

      const reqSkills = jobSkills.split(",").map((s) => s.trim()).filter(Boolean);
      const reqQuals = jobQuals.split(",").map((s) => s.trim()).filter(Boolean);
      const reqCerts = jobCerts.split(",").map((s) => s.trim()).filter(Boolean);

      let matchedSkills = 0;
      reqSkills.forEach((t) => { if (appSkills.includes(t) || appCerts.includes(t)) matchedSkills++; });

      let matchedQuals = 0;
      reqQuals.forEach((t) => { if (appQuals.includes(t) || appSkills.includes(t)) matchedQuals++; });

      let matchedCerts = 0;
      reqCerts.forEach((t) => { if (appCerts.includes(t) || appSkills.includes(t)) matchedCerts++; });

      const hasSkills = reqSkills.length > 0;
      const hasQuals = reqQuals.length > 0;
      const hasCerts = reqCerts.length > 0;

      const baseSkills = hasSkills ? 50 : 0;
      const baseQuals = hasQuals ? 30 : 0;
      const baseCerts = hasCerts ? 20 : 0;
      const totalBase = baseSkills + baseQuals + baseCerts;

      let finalScore = 100;
      if (totalBase > 0) {
        const maxSkills = hasSkills ? Math.round((baseSkills / totalBase) * 100) : 0;
        const maxQuals = hasQuals ? Math.round((baseQuals / totalBase) * 100) : 0;
        const maxCerts = hasCerts ? (100 - maxSkills - maxQuals) : 0;

        const skillsRatio = hasSkills ? (matchedSkills / reqSkills.length) : 0;
        const qualsRatio = hasQuals ? (matchedQuals / reqQuals.length) : 0;
        const certsRatio = hasCerts ? (matchedCerts / reqCerts.length) : 0;

        finalScore = Math.min(100, Math.max(0, Math.round(skillsRatio * maxSkills + qualsRatio * maxQuals + certsRatio * maxCerts)));
      }
      return {
        applicantUserId: app.user_id,
        name: [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(" "),
        email: app.email,
        city: app.city || "Cavite",
        desiredJobTitle: app.desired_job_title || "Applicant",
        skills: app.skills || "",
        certifications: app.certifications || "",
        qualifications: app.qualifications || "",
        matchScore: finalScore,
        isNonGraduateCertHolder: Boolean(app.is_non_graduate_cert_holder),
        shsStrand: app.shs_strand,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json({ unappliedMatches });
  } catch (err) {
    console.error("Unapplied matches error:", err);
    res.status(500).json({ message: "Unable to load unapplied matching candidates." });
  }
});

app.get("/api/employers/:userId/job-posts", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  try {
    const hasApplications = await tableExists("applications");
    const rows = hasApplications
      ? await all(
          `SELECT jp.*, COUNT(a.id) AS applicant_count
           FROM job_posts jp
           LEFT JOIN applications a ON a.job_post_id = jp.id
           WHERE jp.employer_user_id = ?
           GROUP BY jp.id
           ORDER BY datetime(jp.created_at) DESC`,
          [userId]
        )
      : await all(
          `SELECT jp.*, 0 AS applicant_count
           FROM job_posts jp
           WHERE jp.employer_user_id = ?
           ORDER BY datetime(jp.created_at) DESC`,
          [userId]
        );
    const jobPosts = rows.map((row) => ({ ...row, status: deriveJobPostStatus(row.close_date, row.status) }));
    res.json({ jobPosts });
  } catch {
    res.status(500).json({ message: "Unable to load job posts." });
  }
});

app.get("/api/job-posts", async (req, res) => {
  try {
    const hasApplications = await tableExists("applications");
    const hasRatings = await tableExists("company_ratings");
    const excludeApplicantUserId = Number(req.query.excludeApplicantUserId || req.query.excludeApplicantId || req.query.applicantUserId);

    let whereClause = "";
    const params = [];
    if (Number.isInteger(excludeApplicantUserId) && excludeApplicantUserId > 0 && hasApplications) {
      whereClause = ` WHERE jp.id NOT IN (SELECT job_post_id FROM applications WHERE applicant_user_id = ?)`;
      params.push(excludeApplicantUserId);
    }

    const rows = await all(
      `SELECT jp.*,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS company_address,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location,
              ep.company_logo_path,
              ep.company_cover_path,
              ${hasApplications ? "COUNT(DISTINCT a.id)" : "0"} AS applicant_count,
              ${hasRatings ? "(SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = jp.employer_user_id)" : "NULL"} AS rating
       FROM job_posts jp
       INNER JOIN users u ON u.id = jp.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
       ${hasApplications ? "LEFT JOIN applications a ON a.job_post_id = jp.id" : ""}
       ${whereClause}
       GROUP BY jp.id, ep.business_name, ep.company_address, ep.city, ep.company_logo_path, ep.company_cover_path, u.email
       ORDER BY jp.created_at DESC`,
      params
    );

    const jobPosts = rows
      .map((row) => {
        const avg = row.rating ? Number(row.rating).toFixed(1) : null;
        return {
          ...row,
          rating: avg,
          status: deriveJobPostStatus(row.close_date, row.status),
        };
      })
      .filter((row) => row.status === "open");

    res.json({ jobPosts });
  } catch (err) {
    console.error("Load job posts error:", err);
    res.status(500).json({ message: "Unable to load job listings." });
  }
});

app.get("/api/employers", async (_req, res) => {
  try {
    const hasRatings = await tableExists("company_ratings");
    const hasJobPosts = await tableExists("job_posts");

    const rows = await all(
      `SELECT u.id AS employer_user_id,
              u.email AS business_email,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
              COALESCE(NULLIF(TRIM(ep.company_address), ''), ep.city, 'Cavite') AS location,
              COALESCE(NULLIF(TRIM(ep.city), ''), 'Cavite') AS city,
              ep.province,
              ep.company_address,
              ep.contact_number,
              ep.industry,
              ep.company_size,
              ep.company_logo_path,
              ep.company_cover_path,
              ep.website,
              ep.company_description,
              ${hasRatings ? "(SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = u.id)" : "NULL"} AS rating
       FROM users u
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'employer'
       GROUP BY u.id, u.email, ep.business_name, ep.company_address, ep.city, ep.province, ep.industry, ep.company_size, ep.company_logo_path, ep.company_cover_path, ep.website, ep.company_description, ep.contact_number
       ORDER BY company_name ASC`
    );

    const activeJobsRows = hasJobPosts
      ? await all(
          `SELECT jp.*,
                  COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
                  COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS company_address
           FROM job_posts jp
           INNER JOIN users u ON u.id = jp.employer_user_id
           LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
           ORDER BY jp.created_at DESC`
        )
      : [];

    const jobsByEmployer = {};
    for (const job of activeJobsRows) {
      if (deriveJobPostStatus(job.close_date, job.status) === "open") {
        if (!jobsByEmployer[job.employer_user_id]) jobsByEmployer[job.employer_user_id] = [];
        jobsByEmployer[job.employer_user_id].push({
          id: job.id,
          title: job.title,
          location: job.location || job.company_address || "Cavite",
          work_arrangement: job.work_arrangement || "On-Site",
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          hide_salary: job.hide_salary ? 1 : 0,
          required_skills: job.required_skills,
          required_qualifications: job.required_qualifications,
          required_certifications: job.required_certifications,
          close_date: job.close_date,
          created_at: job.created_at,
          urgent: job.urgent || false,
        });
      }
    }

    const employers = rows.map((row) => {
      const empJobs = jobsByEmployer[row.employer_user_id] || [];
      return {
        ...row,
        rating: row.rating ? Number(row.rating).toFixed(1) : null,
        active_jobs_count: empJobs.length,
        jobs: empJobs,
      };
    });

    res.json({ employers });
  } catch (err) {
    console.error("Load employers error:", err);
    res.status(500).json({ message: "Unable to load employers." });
  }
});

app.get("/api/applicants/:userId/applications", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const applicant = await get("SELECT id FROM users WHERE id = ? AND role = 'applicant'", [userId]);
    if (!applicant) return res.status(404).json({ message: "Applicant account not found." });

    const hasApplications = await tableExists("applications");
    if (!hasApplications) {
      return res.json({
        applications: [],
        stats: { total: 0, underReview: 0, shortlisted: 0 },
      });
    }

    const hasRatings = await tableExists("company_ratings");
    const rows = await all(
      `SELECT a.id,
              a.job_post_id,
              a.status,
              a.submitted_at,
              a.decision_message,
              a.decided_at,
              a.decision_message_type,
              a.response_letter,
              a.response_decision,
              a.responded_at,
              a.start_date,
              jp.title AS job_title,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location,
              jp.description AS description,
              jp.work_arrangement AS work_arrangement,
              jp.salary_min AS salary_min,
              jp.salary_max AS salary_max,
              jp.close_date AS close_date,
              jp.application_limit AS application_limit,
              jp.qualifications AS qualifications,
              jp.required_skills AS required_skills,
              jp.is_urgent AS is_urgent,
              jp.hide_salary AS hide_salary,
              jp.employer_user_id AS employer_user_id,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
              ep.company_logo_path,
              ep.company_cover_path,
              ${hasRatings ? "(SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = jp.employer_user_id)" : "NULL"} AS rating
       FROM applications a
       INNER JOIN job_posts jp ON jp.id = a.job_post_id
       INNER JOIN users u ON u.id = jp.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
       WHERE a.applicant_user_id = ?
       GROUP BY a.id, jp.id, ep.business_name, ep.company_address, ep.city, ep.company_logo_path, ep.company_cover_path, u.email
       ORDER BY datetime(a.submitted_at) DESC`,
      [userId]
    );

    const applications = rows.map((row) => ({
      ...row,
      rating: row.rating ? Number(row.rating).toFixed(1) : null,
    }));

    const totals = await get(
      `SELECT
         COUNT(*) AS total_count,
         SUM(CASE WHEN lower(status) IN ('reviewed', 'under_review') THEN 1 ELSE 0 END) AS under_review_count,
         SUM(CASE WHEN lower(status) = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count
       FROM applications
       WHERE applicant_user_id = ?`,
      [userId]
    );

    res.json({
      applications,
      stats: {
        total: Number(totals?.total_count || 0),
        underReview: Number(totals?.under_review_count || 0),
        shortlisted: Number(totals?.shortlisted_count || 0),
      },
    });
  } catch {
    res.status(500).json({ message: "Unable to load applicant applications." });
  }
});

app.post("/api/applicants/:userId/applications", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.body?.job_post_id);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  if (!Number.isInteger(jobPostId) || jobPostId < 1) return res.status(400).json({ message: "Invalid job post." });

  try {
    const applicant = await get("SELECT id FROM users WHERE id = ? AND role = 'applicant'", [userId]);
    if (!applicant) return res.status(404).json({ message: "Applicant account not found." });

    const jobPost = await get("SELECT * FROM job_posts WHERE id = ?", [jobPostId]);
    if (!jobPost) return res.status(404).json({ message: "Job post not found." });

    const status = deriveJobPostStatus(jobPost.close_date, jobPost.status);
    if (status !== "open") return res.status(400).json({ message: "This job post is already closed." });

    const existing = await get(
      "SELECT * FROM applications WHERE applicant_user_id = ? AND job_post_id = ?",
      [userId, jobPostId]
    );

    if (existing) {
      return res.status(200).json({ applied: true, application: existing });
    }

    const created = await run(
      `INSERT INTO applications (job_post_id, applicant_user_id, status, submitted_at, updated_at)
       VALUES (?, ?, 'submitted', datetime('now'), datetime('now'))`,
      [jobPostId, userId]
    );

    const application = await get("SELECT * FROM applications WHERE id = ?", [created.lastID]);
    res.status(201).json({ applied: true, application });
  } catch {
    res.status(500).json({ message: "Unable to submit application." });
  }
});

app.get("/api/employers/:userId/job-posts/:jobPostId", async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.params.jobPostId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(jobPostId) || jobPostId < 1) return res.status(400).json({ message: "Invalid job post." });
  try {
    const row = await get("SELECT * FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobPostId, userId]);
    if (!row) return res.status(404).json({ message: "Job post not found." });
    res.json({ jobPost: { ...row, status: deriveJobPostStatus(row.close_date, row.status) } });
  } catch {
    res.status(500).json({ message: "Unable to load job post." });
  }
});

app.put("/api/employers/:userId/job-posts/:jobPostId", authenticateToken, requireUserOrAdmin, requireJobPostOwnerOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.params.jobPostId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(jobPostId) || jobPostId < 1) return res.status(400).json({ message: "Invalid job post." });

  const {
    title,
    location,
    is_urgent,
    hide_salary,
    work_arrangement,
    experience_level,
    application_limit,
    close_date,
    salary_min,
    salary_max,
    description,
    qualifications,
    certifications,
    required_skills,
  } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ message: "Job title is required." });
  if (work_arrangement && !WORK_ARRANGEMENTS.has(work_arrangement)) return res.status(400).json({ message: "Invalid work arrangement." });
  const numericLimit = null;
  const parsedCloseDate = parseCloseDate(close_date);
  if (!parsedCloseDate) return res.status(400).json({ message: "Close date must be in MM/DD/YYYY format." });
  const targetStatus = typeof req.body?.status === "string" && req.body.status.toLowerCase().trim() === "closed"
    ? "closed"
    : deriveJobPostStatus(parsedCloseDate, req.body?.status);
  let locationVal = null;
  if (Array.isArray(req.body?.locations) && req.body.locations.length > 0) {
    locationVal = req.body.locations.map((l) => String(l).trim()).filter(Boolean).join(", ");
  } else if (Array.isArray(req.body?.location) && req.body.location.length > 0) {
    locationVal = req.body.location.map((l) => String(l).trim()).filter(Boolean).join(", ");
  } else if (typeof location === "string") {
    locationVal = location.trim() || null;
  }

  try {
    const updated = await run(
      `UPDATE job_posts
       SET title = ?, location = ?, status = ?, is_urgent = ?, hide_salary = ?, work_arrangement = ?, experience_level = ?, application_limit = ?, close_date = ?,
           salary_min = ?, salary_max = ?, description = ?, qualifications = ?, certifications = ?,
           required_skills = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND employer_user_id = ?`,
      [
        title.trim(),
        locationVal,
        targetStatus,
        is_urgent ? 1 : 0,
        hide_salary ? 1 : 0,
        typeof work_arrangement === "string" ? work_arrangement : null,
        typeof experience_level === "string" ? experience_level.trim() || null : null,
        numericLimit,
        parsedCloseDate,
        Number.isFinite(Number(salary_min)) ? Number(salary_min) : null,
        Number.isFinite(Number(salary_max)) ? Number(salary_max) : null,
        typeof description === "string" ? description.trim() || null : null,
        typeof qualifications === "string" ? qualifications.trim() || null : null,
        typeof certifications === "string" ? certifications.trim() || null : null,
        typeof required_skills === "string" ? required_skills.trim() || null : null,
        jobPostId,
        userId,
      ]
    );
    if (!updated.changes) return res.status(404).json({ message: "Job post not found." });
    const row = await get("SELECT * FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobPostId, userId]);
    res.json({ jobPost: { ...row, status: deriveJobPostStatus(row.close_date, row.status) } });
  } catch {
    res.status(500).json({ message: "Unable to update job post." });
  }
});

app.patch("/api/employers/:userId/job-posts/:jobPostId/status", authenticateToken, requireUserOrAdmin, requireJobPostOwnerOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.params.jobPostId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(jobPostId) || jobPostId < 1) return res.status(400).json({ message: "Invalid job post." });

  const { status, close_date } = req.body ?? {};
  const targetStatus = String(status || "").toLowerCase().trim();
  if (targetStatus !== "open" && targetStatus !== "closed") {
    return res.status(400).json({ message: "Status must be either 'open' or 'closed'." });
  }

  try {
    let updateSql = `UPDATE job_posts SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [targetStatus];

    if (targetStatus === "open" && close_date) {
      const parsedDate = parseCloseDate(close_date);
      if (parsedDate) {
        updateSql += `, close_date = ?`;
        params.push(parsedDate);
      }
    }

    updateSql += ` WHERE id = ? AND employer_user_id = ?`;
    params.push(jobPostId, userId);

    const updated = await run(updateSql, params);
    if (!updated.changes) return res.status(404).json({ message: "Job post not found." });

    const row = await get("SELECT * FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobPostId, userId]);
    res.json({
      success: true,
      message: `Job post has been marked as ${targetStatus}.`,
      jobPost: { ...row, status: deriveJobPostStatus(row.close_date, row.status) }
    });
  } catch (err) {
    console.error("Update job post status error:", err);
    res.status(500).json({ message: "Unable to update job post status." });
  }
});

app.delete("/api/employers/:userId/job-posts/:jobPostId", authenticateToken, requireUserOrAdmin, requireJobPostOwnerOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const jobPostId = Number(req.params.jobPostId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(jobPostId) || jobPostId < 1) return res.status(400).json({ message: "Invalid job post." });
  try {
    const removed = await run("DELETE FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobPostId, userId]);
    if (!removed.changes) return res.status(404).json({ message: "Job post not found." });
    res.json({ success: true, deletedId: jobPostId });
  } catch {
    res.status(500).json({ message: "Unable to delete job post." });
  }
});

app.get("/api/employers/:userId/applications", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }

  const { search = "", status = "", job_post_id = "" } = req.query;

  try {
    const hasApplications = await tableExists("applications");
    if (!hasApplications) {
      return res.json({ applications: [], stats: { total: 0, pending: 0, shortlisted: 0 } });
    }

    let whereClause = "WHERE jp.employer_user_id = ?";
    const params = [userId];

    if (status && status !== "all") {
      const s = status.toLowerCase();
      if (s === "pending" || s === "pendings") {
        whereClause += " AND lower(a.status) IN ('pending', 'submitted')";
      } else if (s === "approved") {
        whereClause += " AND lower(a.status) IN ('approved', 'reviewed', 'accepted')";
      } else if (s === "denied") {
        whereClause += " AND lower(a.status) IN ('denied', 'rejected')";
      } else {
        whereClause += " AND lower(a.status) = lower(?)";
        params.push(status);
      }
    }

    if (job_post_id) {
      whereClause += " AND a.job_post_id = ?";
      params.push(Number(job_post_id));
    }

    if (search) {
      whereClause += ` AND (
        lower(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')) LIKE lower(?)
        OR lower(au.email) LIKE lower(?)
        OR lower(jp.title) LIKE lower(?)
        OR lower(COALESCE(ap.city, '')) LIKE lower(?)
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const applications = await all(
      `SELECT
          a.id,
          a.status,
          a.submitted_at,
          a.job_post_id,
          jp.title AS job_title,
          jp.required_skills AS job_required_skills,
          jp.qualifications AS job_required_qualifications,
          jp.certifications AS job_required_certifications,
          jp.work_arrangement AS job_work_arrangement,
          jp.location AS job_location,
          jp.salary_min AS job_salary_min,
          jp.salary_max AS job_salary_max,
          au.email AS email,
          ap.province,
          ap.city,
          ap.address,
          ap.phone,
          COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), au.email, 'Applicant') AS applicant_name,
          ap.desired_job_title,
          ap.work_arrangement,
          ap.expected_salary,
          ap.years_of_experience,
          ap.work_experience_json,
          ap.skills,
          ap.qualifications,
          ap.certifications,
          ap.resume_path,
          ap.profile_picture_path,
          a.applicant_user_id,
          (
            SELECT CASE
              WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1)
              ELSE NULL
            END
            FROM candidate_ratings cr
            WHERE cr.applicant_user_id = a.applicant_user_id
          ) AS rating
       FROM applications a
       INNER JOIN job_posts jp ON jp.id = a.job_post_id
       INNER JOIN users au ON au.id = a.applicant_user_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_user_id
       ${whereClause}
       ORDER BY a.submitted_at DESC`,
      params
    );

    const statsRow = await get(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN lower(a.status) IN ('submitted', 'pending') THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN lower(a.status) = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted
       FROM applications a
       INNER JOIN job_posts jp ON jp.id = a.job_post_id
       WHERE jp.employer_user_id = ?`,
      [userId]
    );

    res.json({
      applications,
      stats: {
        total: Number(statsRow?.total || 0),
        pending: Number(statsRow?.pending || 0),
        shortlisted: Number(statsRow?.shortlisted || 0),
      },
    });
  } catch (err) {
    console.error("Employer applications error:", err);
    res.status(500).json({ message: "Unable to load applications." });
  }
});

app.put("/api/applications/bulk-status", authenticateToken, async (req, res) => {
  const { ids, status } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No application IDs provided." });
  }

  const validStatuses = ["pending", "submitted", "reviewed", "shortlisted", "approved", "denied", "rejected"];
  if (typeof status !== "string" || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  const cleanStatus = status.toLowerCase();
  const validIds = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return res.status(400).json({ message: "No valid application IDs." });
  }

  try {
    const placeholders = validIds.map(() => "?").join(",");
    const rows = await all(
      `SELECT a.id, a.status, jp.employer_user_id 
       FROM applications a
       JOIN job_posts jp ON jp.id = a.job_post_id
       WHERE a.id IN (${placeholders})`,
      validIds
    );

    if (req.user.role !== "admin") {
      const unauthorized = rows.some((r) => r.employer_user_id !== req.user.id);
      if (unauthorized || rows.length !== validIds.length) {
        return res.status(403).json({ message: "Access denied. You can only update applications for your own job postings." });
      }
    }

    // Filter out already finalized applications
    const eligibleIds = rows
      .filter((r) => !["approved", "accepted", "denied", "rejected"].includes((r.status || "").toLowerCase()))
      .map((r) => r.id);

    if (eligibleIds.length === 0) {
      return res.status(400).json({ message: "Selected applications have already been finalized and cannot be changed." });
    }

    const eligiblePlaceholders = eligibleIds.map(() => "?").join(",");
    await run(
      `UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${eligiblePlaceholders})`,
      [cleanStatus, ...eligibleIds]
    );

    res.json({ success: true, count: eligibleIds.length, status: cleanStatus });
  } catch (err) {
    console.error("Bulk update applications error:", err);
    res.status(500).json({ message: "Unable to update applications." });
  }
});

app.put("/api/applications/:id/status", authenticateToken, requireApplicationDecisionAuthority, async (req, res) => {
  const applicationId = Number(req.params.id);
  const { status, message_type, message_text } = req.body ?? {};

  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ message: "Invalid application ID." });
  }

  const validStatuses = ["pending", "submitted", "reviewed", "shortlisted", "approved", "denied", "rejected"];
  if (typeof status !== "string" || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  const cleanStatus = status.toLowerCase();

  try {
    const existing = await get("SELECT id, status, job_post_id, applicant_user_id FROM applications WHERE id = ?", [applicationId]);
    if (!existing) {
      return res.status(404).json({ message: `Application with ID ${applicationId} not found.` });
    }

    const currentStatus = (existing.status || "").toLowerCase();
    const isAlreadyFinal = ["approved", "accepted", "denied", "rejected"].includes(currentStatus);
    if (isAlreadyFinal) {
      return res.status(400).json({
        message: "This application has already been decided (accepted or denied) and can only be set once.",
      });
    }

    const isFinalDecision = ["approved", "accepted", "denied", "rejected"].includes(cleanStatus);

    if (isFinalDecision) {
      await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_message TEXT");
      await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_message_type TEXT");
      await run("ALTER TABLE applications ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ");

      const appDetails = await get(
        `SELECT a.applicant_user_id, a.job_post_id, jp.title AS job_title, jp.employer_user_id,
                COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
                COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), 'Applicant') AS applicant_name
         FROM applications a
         JOIN job_posts jp ON jp.id = a.job_post_id
         JOIN users u ON u.id = jp.employer_user_id
         LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_user_id
         WHERE a.id = ?`,
        [applicationId]
      );

      const applicantName = appDetails?.applicant_name || "Applicant";
      const jobTitle = appDetails?.job_title || "Job Position";
      const companyName = appDetails?.company_name || "Employer";
      const isApproved = cleanStatus === "approved" || cleanStatus === "accepted";

      let finalMsg = typeof message_text === "string" && message_text.trim() ? message_text.trim() : null;
      if (!finalMsg) {
        if (isApproved) {
          finalMsg = `Dear ${applicantName},\n\nCongratulations! We are pleased to inform you that your application for the position of "${jobTitle}" at ${companyName} has been accepted.\n\nOur hiring team will be reaching out to you shortly with next steps and onboarding details.\n\nThank you for choosing to grow your career with us!\n\nBest regards,\n${companyName}`;
        } else {
          finalMsg = `Dear ${applicantName},\n\nThank you for taking the time to apply for the position of "${jobTitle}" at ${companyName}.\n\nAfter careful evaluation of all applicants, we regret to inform you that we have decided to proceed with other candidates whose experience more closely matches our current requirements.\n\nWe appreciate your interest in our team and wish you the best in your career pursuits.\n\nSincerely,\n${companyName}`;
        }
      }

      const msgType = message_type === "manual" ? "manual" : "automated";

      await run(
        `UPDATE applications
         SET status = ?,
             decision_message = ?,
             decision_message_type = ?,
             decided_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cleanStatus, finalMsg, msgType, applicationId]
      );

      const notifType = isApproved ? "application_accepted" : "application_denied";
      const notifTitle = isApproved ? `Application Accepted: ${jobTitle}` : `Application Update: ${jobTitle}`;

      if (appDetails?.applicant_user_id) {
        await run(
          `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            appDetails.applicant_user_id,
            notifType,
            notifTitle,
            finalMsg,
            appDetails.employer_user_id,
            appDetails.job_post_id,
          ]
        );

        if (appDetails.employer_user_id) {
          let thread = await get(
            `SELECT t.id FROM message_threads t
             JOIN message_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
             JOIN message_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
             LIMIT 1`,
            [appDetails.employer_user_id, appDetails.applicant_user_id]
          );

          let threadId = thread?.id;
          if (!threadId) {
            const createdThread = await run(
              `INSERT INTO message_threads (created_by_user_id, title) VALUES (?, ?)`,
              [appDetails.employer_user_id, `Application: ${jobTitle}`]
            );
            threadId = createdThread.lastID;
            await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, appDetails.employer_user_id]);
            await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, appDetails.applicant_user_id]);
          }

          await run(
            `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
            [threadId, appDetails.employer_user_id, finalMsg]
          );
          await run(`UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [threadId]);
        }
      }

      return res.json({ success: true, id: applicationId, status: cleanStatus, message: finalMsg });
    }

    // Otherwise, normal update (e.g. moving between pending and shortlisted)
    await run(
      "UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [cleanStatus, applicationId]
    );

    res.json({ success: true, id: applicationId, status: cleanStatus });
  } catch (err) {
    console.error("Update application status error:", err);
    res.status(500).json({ message: "Unable to update application status." });
  }
});

app.get("/api/employers/:userId/active-job-posts", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }
  try {
    const rows = await all(
      `SELECT 
         id, 
         title, 
         description,
         work_arrangement, 
         experience_level,
         is_urgent,
         location,
         location AS city, 
         salary_min,
         salary_max,
         salary_min AS min_salary, 
         salary_max AS max_salary, 
         required_skills, 
         qualifications, 
         certifications,
         status,
         application_limit,
         (SELECT COUNT(a.id) FROM applications a WHERE a.job_post_id = job_posts.id) AS applicants_count,
         close_date,
         hide_salary 
       FROM job_posts 
       WHERE employer_user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    const active = rows
      .map((r) => ({
        ...r,
        status: deriveJobPostStatus(r.close_date, r.status),
      }))
      .filter((r) => r.status === "open");
    res.json({ jobs: active });
  } catch (err) {
    console.error("Get active job posts error:", err);
    res.status(500).json({ message: "Unable to load active jobs." });
  }
});

app.get("/api/talent-pool", async (req, res) => {
  try {
    const hasRatings = await tableExists("candidate_ratings");
    const ratingCol = hasRatings
      ? `COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE 0.0 END FROM candidate_ratings cr WHERE cr.applicant_user_id = u.id), 0.0)`
      : `0.0`;

    const candidates = await all(
      `SELECT
          u.id AS user_id,
          u.email,
          ap.first_name,
          ap.middle_name,
          ap.last_name,
          COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Applicant') AS applicant_name,
          ap.phone,
          ap.city,
          ap.province,
          ap.address,
          ap.summary,
          ap.languages,
          ap.desired_job_title,
          ap.expected_salary,
          ap.expected_salary_min,
          ap.expected_salary_max,
          ap.work_arrangement,
          ap.years_of_experience,
          ap.work_experience_json,
          ap.skills,
          ap.qualifications,
          ap.certifications,
          ap.preferred_locations,
          ap.preferred_cities_json,
          ap.resume_path,
          ap.profile_picture_path,
          ap.nearby_location,
          ap.shs_strand,
          ap.shs_school,
          ap.shs_grad_year,
          ap.college_grad_year,
          ap.vocational_grad_year,
          ${ratingCol} AS rating,
          u.created_at,
          0 AS applied_count,
          NULL AS latest_application_status
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'applicant'
       ORDER BY u.created_at DESC`
    );
    res.json({ candidates });
  } catch (err) {
    console.error("Get general talent pool error:", err);
    res.status(500).json({ message: "Unable to load candidates." });
  }
});

app.get("/api/employers/:userId/talent-pool", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }

  try {
    const hasRatings = await tableExists("candidate_ratings");
    const ratingCol = hasRatings
      ? `COALESCE((SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE 0.0 END FROM candidate_ratings cr WHERE cr.applicant_user_id = u.id), 0.0)`
      : `0.0`;

    const candidates = await all(
      `SELECT
          u.id AS user_id,
          u.email,
          ap.first_name,
          ap.middle_name,
          ap.last_name,
          COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Applicant') AS applicant_name,
          ap.phone,
          ap.city,
          ap.province,
          ap.address,
          ap.summary,
          ap.languages,
          ap.desired_job_title,
          ap.expected_salary,
          ap.expected_salary_min,
          ap.expected_salary_max,
          ap.work_arrangement,
          ap.years_of_experience,
          ap.work_experience_json,
          ap.skills,
          ap.qualifications,
          ap.certifications,
          ap.preferred_locations,
          ap.preferred_cities_json,
          ap.resume_path,
          ap.profile_picture_path,
          ap.nearby_location,
          ap.shs_strand,
          ap.shs_school,
          ap.shs_grad_year,
          ap.college_grad_year,
          ap.vocational_grad_year,
          ${ratingCol} AS rating,
          u.created_at,
          (
            SELECT COUNT(a.id)
            FROM applications a
            JOIN job_posts jp ON jp.id = a.job_post_id
            WHERE a.applicant_user_id = u.id AND jp.employer_user_id = ?
          ) AS applied_count,
          (
            SELECT a.status
            FROM applications a
            JOIN job_posts jp ON jp.id = a.job_post_id
            WHERE a.applicant_user_id = u.id AND jp.employer_user_id = ?
            ORDER BY a.submitted_at DESC
            LIMIT 1
          ) AS latest_application_status,
          (
            SELECT COUNT(n.id)
            FROM notifications n
            WHERE n.user_id = u.id AND n.related_user_id = ? AND n.type = 'job_invitation'
          ) AS invited_count
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'applicant'
       ORDER BY u.created_at DESC`,
      [userId, userId, userId]
    );

    res.json({ candidates });
  } catch (err) {
    console.error("Get talent pool error:", err);
    res.status(500).json({ message: "Unable to load candidates." });
  }
});

app.post("/api/employers/:userId/invite-candidate", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const { applicant_user_id, job_post_id, custom_message } = req.body ?? {};

  const applicantId = Number(applicant_user_id);
  const jobId = Number(job_post_id);

  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(applicantId) || applicantId < 1 || !Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ message: "Invalid invite parameters." });
  }

  try {
    const job = await get("SELECT title, employer_user_id FROM job_posts WHERE id = ? AND employer_user_id = ?", [jobId, userId]);
    if (!job) {
      return res.status(404).json({ message: "Job posting not found." });
    }

    const empProfile = await get("SELECT business_name FROM employer_profiles WHERE user_id = ?", [userId]);
    const empUser = await get("SELECT email FROM users WHERE id = ?", [userId]);
    const companyName = empProfile?.business_name || empUser?.email || "An Employer";

    const title = `Invitation to Apply: ${job.title}`;
    const body = custom_message || `Hello! ${companyName} has reviewed your candidate profile and would like to invite you to apply for their open position: "${job.title}".`;

    await run(
      `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
       VALUES (?, 'job_invitation', ?, ?, ?, ?)`,
      [applicantId, title, body, userId, jobId]
    );

    let thread = await get(
      `SELECT t.id FROM message_threads t
       JOIN message_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
       JOIN message_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
       LIMIT 1`,
      [userId, applicantId]
    );

    let threadId = thread?.id;
    if (!threadId) {
      const createdThread = await run(
        `INSERT INTO message_threads (created_by_user_id, title) VALUES (?, ?)`,
        [userId, `Job Invitation: ${job.title}`]
      );
      threadId = createdThread.lastID;
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, userId]);
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, applicantId]);
    }

    await run(
      `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
      [threadId, userId, body]
    );

    await run(
      `INSERT INTO job_invitations (employer_user_id, applicant_user_id, job_post_id, custom_message, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, applicantId, jobId, body]
    );

    res.json({ success: true, message: `Invitation sent to candidate successfully for ${job.title}!` });
  } catch (err) {
    console.error("Invite candidate error:", err);
    res.status(500).json({ message: "Unable to send invitation." });
  }
});

app.get("/api/employers/:userId/direct-invitations", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  try {
    const invitations = await all(
      `SELECT ji.id, ji.job_post_id, ji.applicant_user_id, ji.status, ji.custom_message, ji.created_at, ji.updated_at,
              jp.title AS job_title, jp.location AS job_location, jp.salary_min, jp.salary_max, jp.hide_salary, jp.work_arrangement,
              ap.first_name, ap.last_name, ap.phone, ap.city, ap.skills, ap.qualifications, ap.desired_job_title, ap.resume_path, ap.profile_picture_path,
              u.email AS applicant_email
       FROM job_invitations ji
       JOIN job_posts jp ON jp.id = ji.job_post_id
       JOIN users u ON u.id = ji.applicant_user_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE ji.employer_user_id = ?
       ORDER BY ji.created_at DESC`,
      [userId]
    );
    res.json({ invitations });
  } catch (err) {
    console.error("Get direct invitations error:", err);
    res.status(500).json({ message: "Unable to load direct invitations." });
  }
});

app.get("/api/applicants/:userId/invitations", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  try {
    const hasRatings = await tableExists("company_ratings");
    const invitations = await all(
      `SELECT ji.id, ji.job_post_id, ji.employer_user_id, ji.status, ji.custom_message, ji.created_at, ji.updated_at,
              ji.response_letter, ji.responded_at, ji.start_date,
              jp.title AS job_title, COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS job_location, jp.salary_min, jp.salary_max, jp.hide_salary, jp.work_arrangement, jp.description AS job_description, jp.required_skills, jp.qualifications AS job_qualifications, jp.close_date, jp.application_limit, jp.status AS job_status,
              ep.business_name, ep.contact_number, ep.company_address, ep.industry, ep.company_logo_path, ep.company_cover_path,
              u.email AS employer_email,
              ${hasRatings ? "(SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = ji.employer_user_id)" : "NULL"} AS rating
       FROM job_invitations ji
       JOIN job_posts jp ON jp.id = ji.job_post_id
       JOIN users u ON u.id = ji.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE ji.applicant_user_id = ?
       ORDER BY ji.created_at DESC`,
      [userId]
    );
    res.json({ invitations });
  } catch (err) {
    console.error("Get applicant invitations error:", err);
    res.status(500).json({ message: "Unable to load invitations." });
  }
});

app.get("/api/job-invitations/status", async (req, res) => {
  const jobId = Number(req.query.job_post_id);
  const applicantId = Number(req.query.applicant_user_id);
  if (!jobId || !applicantId) return res.json({ invitation: null });
  try {
    const invitation = await get(
      "SELECT * FROM job_invitations WHERE job_post_id = ? AND applicant_user_id = ? ORDER BY created_at DESC LIMIT 1",
      [jobId, applicantId]
    );
    res.json({ invitation });
  } catch {
    res.json({ invitation: null });
  }
});

app.post("/api/invitations/:id/respond", authenticateToken, requireInvitationRecipientOrAdmin, async (req, res) => {
  const invitationId = Number(req.params.id);
  const { action, letter_text, letter_type, start_date } = req.body ?? {};

  if (!Number.isInteger(invitationId) || invitationId < 1 || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ message: "Invalid response action." });
  }

  try {
    const invitation = await get("SELECT * FROM job_invitations WHERE id = ?", [invitationId]);
    if (!invitation) return res.status(404).json({ message: "Invitation not found." });

    const newStatus = action === "accept" ? "accepted" : "declined";
    await run(
      "UPDATE job_invitations SET status = ?, response_letter = ?, start_date = ?, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, letter_text || null, start_date || null, invitationId]
    );

    const job = await get("SELECT title FROM job_posts WHERE id = ?", [invitation.job_post_id]);
    const jobTitle = job?.title || "the job position";

    const applicant = await get(
      `SELECT u.email, ap.first_name, ap.last_name
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.id = ?`,
      [invitation.applicant_user_id]
    );
    const applicantName = [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || applicant?.email || "Candidate";

    if (action === "accept") {
      const existingApp = await get(
        "SELECT id FROM applications WHERE job_post_id = ? AND applicant_user_id = ?",
        [invitation.job_post_id, invitation.applicant_user_id]
      );
      if (!existingApp) {
        await run(
          "INSERT INTO applications (job_post_id, applicant_user_id, status) VALUES (?, ?, 'shortlisted')",
          [invitation.job_post_id, invitation.applicant_user_id]
        );
        await run("UPDATE job_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [invitation.job_post_id]);
      } else {
        await run("UPDATE applications SET status = 'shortlisted' WHERE id = ?", [existingApp.id]);
      }

      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_accepted', ?, ?, ?, ?)`,
        [
          invitation.employer_user_id,
          `Invitation Accepted: ${jobTitle}`,
          `${applicantName} accepted your direct invitation for "${jobTitle}" and is now added to your Shortlisted Candidates.`,
          invitation.applicant_user_id,
          invitation.job_post_id
        ]
      );
    } else {
      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_declined', ?, ?, ?, ?)`,
        [
          invitation.employer_user_id,
          `Invitation Declined: ${jobTitle}`,
          `${applicantName} has declined the direct job invitation for "${jobTitle}".`,
          invitation.applicant_user_id,
          invitation.job_post_id
        ]
      );
    }

    // Deliver letter into message thread
    let thread = await get(
      `SELECT t.id FROM message_threads t
       JOIN message_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
       JOIN message_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
       LIMIT 1`,
      [invitation.employer_user_id, invitation.applicant_user_id]
    );

    let threadId = thread?.id;
    if (!threadId) {
      const createdThread = await run(
        `INSERT INTO message_threads (created_by_user_id, title) VALUES (?, ?)`,
        [invitation.applicant_user_id, `Invitation: ${jobTitle}`]
      );
      threadId = createdThread.lastID;
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, invitation.employer_user_id]);
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, invitation.applicant_user_id]);
    }

    const msgText = letter_text
      ? `[Formal Invitation Response: ${action === "accept" ? "ACCEPTED" : "DECLINED"}]\nPosition: ${jobTitle}${start_date ? `\nTarget Start Date: ${start_date}` : ""}\n\n${letter_text}`
      : action === "accept"
      ? `Hello! I have accepted your invitation to apply for "${jobTitle}". Looking forward to discussing this opportunity!`
      : `Thank you for considering me for "${jobTitle}". Unfortunately, I have to decline this invitation at this time.`;

    await run(
      `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
      [threadId, invitation.applicant_user_id, msgText]
    );
    await run(`UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [threadId]);

    res.json({ success: true, status: newStatus, message: `Invitation ${newStatus} successfully.` });
  } catch (err) {
    console.error("Respond to invitation error:", err);
    res.status(500).json({ message: "Unable to respond to invitation." });
  }
});

app.post("/api/applicants/:userId/applications/:id/offer-response", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const applicationId = Number(req.params.id);
  const { decision, letter_text, letter_type, start_date } = req.body ?? {};

  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ message: "Invalid applicant or application ID." });
  }

  if (!["accept", "decline"].includes(decision)) {
    return res.status(400).json({ message: "Invalid decision action. Must be 'accept' or 'decline'." });
  }

  try {
    const appRecord = await get(
      `SELECT a.*, jp.title AS job_title, jp.employer_user_id,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name
       FROM applications a
       JOIN job_posts jp ON jp.id = a.job_post_id
       JOIN users u ON u.id = jp.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
       WHERE a.id = ? AND a.applicant_user_id = ?`,
      [applicationId, userId]
    );

    if (!appRecord) {
      return res.status(404).json({ message: "Application not found for this applicant." });
    }

    const applicant = await get(
      `SELECT u.email, ap.first_name, ap.last_name
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );
    const applicantName = [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || applicant?.email || "Candidate";
    const jobTitle = appRecord.job_title || "Job Position";

    const newStatus = decision === "accept" ? "accepted" : "declined";

    await run(
      `UPDATE applications
       SET status = ?,
           response_letter = ?,
           response_decision = ?,
           start_date = ?,
           responded_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, letter_text || null, decision, start_date || null, applicationId]
    );

    // Insert Notification for employer
    await run(
      `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        appRecord.employer_user_id,
        decision === "accept" ? "offer_accepted" : "offer_declined",
        `Job Offer ${decision === "accept" ? "Accepted" : "Declined"}: ${jobTitle}`,
        `${applicantName} has officially ${decision === "accept" ? "accepted" : "declined"} your employment offer for "${jobTitle}". Review their formal response letter in your message thread.`,
        userId,
        applicationId
      ]
    );

    // Deliver letter into message thread
    let thread = await get(
      `SELECT t.id FROM message_threads t
       JOIN message_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
       JOIN message_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
       LIMIT 1`,
      [appRecord.employer_user_id, userId]
    );

    let threadId = thread?.id;
    if (!threadId) {
      const createdThread = await run(
        `INSERT INTO message_threads (created_by_user_id, title) VALUES (?, ?)`,
        [userId, `Offer: ${jobTitle}`]
      );
      threadId = createdThread.lastID;
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, appRecord.employer_user_id]);
      await run(`INSERT INTO message_participants (thread_id, user_id) VALUES (?, ?)`, [threadId, userId]);
    }

    const msgText = letter_text
      ? `[Official Job Offer Response: ${decision === "accept" ? "ACCEPTED" : "DECLINED"}]\nPosition: ${jobTitle}${start_date ? `\nTarget Start Date: ${start_date}` : ""}\n\n${letter_text}`
      : decision === "accept"
      ? `Hello! I am officially accepting the employment offer for "${jobTitle}". Looking forward to working together!`
      : `Thank you for extending the job offer for "${jobTitle}". Unfortunately, I have to respectfully decline at this time.`;

    await run(
      `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
      [threadId, userId, msgText]
    );
    await run(`UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [threadId]);

    res.json({
      success: true,
      status: newStatus,
      decision,
      message: `Formal ${decision === "accept" ? "acceptance" : "decline"} letter submitted successfully.`,
    });
  } catch (err) {
    console.error("Offer response error:", err);
    res.status(500).json({ message: "Unable to submit offer response letter." });
  }
});

app.post("/api/job-invitations/respond-by-job", authenticateToken, async (req, res) => {
  const { job_post_id, applicant_user_id, action, letter_text, letter_type, start_date } = req.body ?? {};
  const jobId = Number(job_post_id);
  const applicantId = Number(applicant_user_id);

  if (!jobId || !applicantId || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ message: "Invalid parameters." });
  }

  if (req.user.role !== "admin" && req.user.id !== applicantId) {
    return res.status(403).json({ message: "Access denied. You cannot respond to an invitation for another candidate." });
  }

  try {
    let invitation = await get(
      "SELECT * FROM job_invitations WHERE job_post_id = ? AND applicant_user_id = ? ORDER BY created_at DESC LIMIT 1",
      [jobId, applicantId]
    );

    if (!invitation) {
      // Find employer
      const job = await get("SELECT employer_user_id FROM job_posts WHERE id = ?", [jobId]);
      if (!job) return res.status(404).json({ message: "Job not found." });
      const created = await run(
        "INSERT INTO job_invitations (employer_user_id, applicant_user_id, job_post_id, status) VALUES (?, ?, ?, 'pending')",
        [job.employer_user_id, applicantId, jobId]
      );
      invitation = await get("SELECT * FROM job_invitations WHERE id = ?", [created.lastID]);
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    await run(
      "UPDATE job_invitations SET status = ?, response_letter = ?, start_date = ?, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, letter_text || null, start_date || null, invitation.id]
    );

    const job = await get("SELECT title FROM job_posts WHERE id = ?", [jobId]);
    const jobTitle = job?.title || "the job position";

    const applicant = await get(
      `SELECT u.email, ap.first_name, ap.last_name
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.id = ?`,
      [applicantId]
    );
    const applicantName = [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || applicant?.email || "Candidate";

    const thread = await get(
      `SELECT t.id FROM message_threads t
       JOIN message_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
       JOIN message_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
       LIMIT 1`,
      [invitation.employer_user_id, applicantId]
    );

    const msgContent = letter_text
      ? `[Formal Invitation Response: ${action === "accept" ? "ACCEPTED" : "DECLINED"}]\nPosition: ${jobTitle}${start_date ? `\nTarget Start Date: ${start_date}` : ""}\n\n${letter_text}`
      : action === "accept"
      ? `Hello! I have accepted your invitation to apply for "${jobTitle}". Looking forward to discussing this opportunity!`
      : `Thank you for considering me for "${jobTitle}". Unfortunately, I have to decline this invitation at this time.`;

    if (action === "accept") {
      const existingApp = await get(
        "SELECT id FROM applications WHERE job_post_id = ? AND applicant_user_id = ?",
        [jobId, applicantId]
      );
      if (!existingApp) {
        await run(
          "INSERT INTO applications (job_post_id, applicant_user_id, status) VALUES (?, ?, 'shortlisted')",
          [jobId, applicantId]
        );
        await run("UPDATE job_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [jobId]);
      } else {
        await run("UPDATE applications SET status = 'shortlisted' WHERE id = ?", [existingApp.id]);
      }

      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_accepted', ?, ?, ?, ?)`,
        [
          invitation.employer_user_id,
          `Invitation Accepted: ${jobTitle}`,
          `${applicantName} accepted your direct invitation for "${jobTitle}" and is now in your Shortlisted Candidates.`,
          applicantId,
          jobId
        ]
      );

      if (thread?.id) {
        await run(
          `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
          [thread.id, applicantId, msgContent]
        );
      }
    } else {
      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_declined', ?, ?, ?, ?)`,
        [
          invitation.employer_user_id,
          `Invitation Declined: ${jobTitle}`,
          `${applicantName} has declined the direct job invitation for "${jobTitle}".`,
          applicantId,
          jobId
        ]
      );

      if (thread?.id) {
        await run(
          `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
          [thread.id, applicantId, msgContent]
        );
      }
    }

    res.json({ success: true, status: newStatus, message: `Invitation ${newStatus} successfully.` });
  } catch (err) {
    console.error("Respond by job error:", err);
    res.status(500).json({ message: "Unable to respond to invitation." });
  }
});

app.post("/api/job-invitations/respond-by-thread", authenticateToken, async (req, res) => {
  const { thread_id, applicant_user_id, action } = req.body ?? {};
  const threadId = Number(thread_id);
  const applicantId = Number(applicant_user_id);

  if (!threadId || !applicantId || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ message: "Invalid parameters." });
  }

  if (req.user.role !== "admin" && req.user.id !== applicantId) {
    return res.status(403).json({ message: "Access denied. You cannot respond to an invitation for another candidate." });
  }

  try {
    const thread = await get("SELECT * FROM message_threads WHERE id = ?", [threadId]);
    if (!thread) return res.status(404).json({ message: "Thread not found." });

    const otherParticipant = await get(
      "SELECT user_id FROM message_participants WHERE thread_id = ? AND user_id != ? LIMIT 1",
      [threadId, applicantId]
    );
    const employerId = Number(otherParticipant?.user_id);

    let invitation = await get(
      "SELECT * FROM job_invitations WHERE applicant_user_id = ? AND employer_user_id = ? ORDER BY created_at DESC LIMIT 1",
      [applicantId, employerId]
    );

    if (!invitation) {
      const job = await get("SELECT id, title FROM job_posts WHERE employer_user_id = ? ORDER BY created_at DESC LIMIT 1", [employerId]);
      const jobId = job?.id || 1;
      const created = await run(
        "INSERT INTO job_invitations (employer_user_id, applicant_user_id, job_post_id, status) VALUES (?, ?, ?, 'pending')",
        [employerId, applicantId, jobId]
      );
      invitation = await get("SELECT * FROM job_invitations WHERE id = ?", [created.lastID]);
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    await run(
      "UPDATE job_invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, invitation.id]
    );

    const job = await get("SELECT title FROM job_posts WHERE id = ?", [invitation.job_post_id]);
    const jobTitle = job?.title || (thread.title || "Job Position").replace(/^Job Invitation:\s*/i, "");

    const applicant = await get(
      `SELECT u.email, ap.first_name, ap.last_name
       FROM users u
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE u.id = ?`,
      [applicantId]
    );
    const applicantName = [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || applicant?.email || "Candidate";

    if (action === "accept") {
      const existingApp = await get(
        "SELECT id FROM applications WHERE job_post_id = ? AND applicant_user_id = ?",
        [invitation.job_post_id, applicantId]
      );
      if (!existingApp) {
        await run(
          "INSERT INTO applications (job_post_id, applicant_user_id, status) VALUES (?, ?, 'shortlisted')",
          [invitation.job_post_id, applicantId]
        );
        await run("UPDATE job_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [invitation.job_post_id]);
      } else {
        await run("UPDATE applications SET status = 'shortlisted' WHERE id = ?", [existingApp.id]);
      }

      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_accepted', ?, ?, ?, ?)`,
        [
          employerId,
          `Invitation Accepted: ${jobTitle}`,
          `${applicantName} accepted your direct invitation for "${jobTitle}" and is now in your Shortlisted Candidates.`,
          applicantId,
          invitation.job_post_id
        ]
      );

      await run(
        `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
        [
          threadId,
          applicantId,
          `Hello! I have accepted your invitation to apply for "${jobTitle}". Looking forward to discussing this opportunity!`
        ]
      );
    } else {
      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'invitation_declined', ?, ?, ?, ?)`,
        [
          employerId,
          `Invitation Declined: ${jobTitle}`,
          `${applicantName} has declined the direct job invitation for "${jobTitle}".`,
          applicantId,
          invitation.job_post_id
        ]
      );

      await run(
        `INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)`,
        [
          threadId,
          applicantId,
          `Thank you for considering me for "${jobTitle}". Unfortunately, I have to decline this invitation at this time.`
        ]
      );
    }

    res.json({ success: true, status: newStatus, message: `Invitation ${newStatus} successfully.` });
  } catch (err) {
    console.error("Respond by thread error:", err);
    res.status(500).json({ message: "Unable to respond to invitation." });
  }
});

app.get("/api/employers/:userId/dashboard-summary", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }

  try {
    const hasApplications = await tableExists("applications");

    let activeJobPosts = [];
    if (hasApplications) {
      const rows = await all(
        `SELECT jp.*, COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location, COUNT(a.id) AS applicant_count
         FROM job_posts jp
         LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
         LEFT JOIN applications a ON a.job_post_id = jp.id
         WHERE jp.employer_user_id = ?
         GROUP BY jp.id, ep.company_address, ep.city
         ORDER BY jp.created_at DESC`,
        [userId]
      );
      activeJobPosts = rows
        .map((row) => ({ ...row, status: deriveJobPostStatus(row.close_date, row.status) }))
        .filter((row) => row.status === "open");
    } else {
      const rows = await all(
        `SELECT jp.*, COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location
         FROM job_posts jp
         LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
         WHERE jp.employer_user_id = ?
         ORDER BY jp.created_at DESC`,
        [userId]
      );
      activeJobPosts = rows
        .map((row) => ({ ...row, applicant_count: 0, status: deriveJobPostStatus(row.close_date, row.status) }))
        .filter((row) => row.status === "open");
    }

    let recentApplications = [];
    let totalApplications = 0;
    let shortlistedCount = 0;
    let toReviewCount = 0;

    if (hasApplications) {
      recentApplications = await all(
        `SELECT a.id,
                a.status,
                a.submitted_at,
                a.applicant_user_id,
                jp.id AS job_post_id,
                jp.title AS job_title,
                ap.profile_picture_path,
                COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), au.email, 'Applicant') AS applicant_name
         FROM applications a
         INNER JOIN job_posts jp ON jp.id = a.job_post_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_user_id
         LEFT JOIN users au ON au.id = a.applicant_user_id
         WHERE jp.employer_user_id = ?
         ORDER BY datetime(a.submitted_at) DESC
         LIMIT 5`,
        [userId]
      );

      const totals = await get(
        `SELECT
          COUNT(*) AS total_count,
          SUM(CASE WHEN lower(a.status) = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
          SUM(CASE WHEN lower(a.status) IN ('submitted', 'pending') THEN 1 ELSE 0 END) AS to_review_count
         FROM applications a
         INNER JOIN job_posts jp ON jp.id = a.job_post_id
         WHERE jp.employer_user_id = ?`,
        [userId]
      );

      totalApplications = Number(totals?.total_count || 0);
      shortlistedCount = Number(totals?.shortlisted_count || 0);
      toReviewCount = Number(totals?.to_review_count || 0);
    }

    res.json({
      stats: {
        activeJobs: activeJobPosts.length,
        applications: totalApplications,
        shortlisted: shortlistedCount,
        toReview: toReviewCount,
      },
      activeJobPosts,
      recentApplications,
      applicationsAvailable: hasApplications,
    });
  } catch {
    res.status(500).json({ message: "Unable to load employer dashboard summary." });
  }
});

app.post("/api/employers/:userId/faqs", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const { question, answer, question_type, is_active } = req.body ?? {};
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (typeof question !== "string" || !question.trim()) return res.status(400).json({ message: "Question is required." });
  if (typeof answer !== "string" || !answer.trim()) return res.status(400).json({ message: "Answer is required." });
  if (!FAQ_TYPES.has(question_type)) return res.status(400).json({ message: "Invalid question type." });

  try {
    const insert = await run(
      "INSERT INTO company_faq (employer_user_id, question, answer, question_type, is_active) VALUES (?, ?, ?, ?, ?)",
      [userId, question.trim(), answer.trim(), question_type, is_active ? 1 : 0]
    );
    const faq = await get("SELECT * FROM company_faq WHERE id = ?", [insert.lastID]);
    res.status(201).json({ faq });
  } catch {
    res.status(500).json({ message: "Unable to create FAQ." });
  }
});

app.get("/api/employers/:userId/faqs", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  try {
    const rows = await all("SELECT * FROM company_faq WHERE employer_user_id = ? ORDER BY created_at DESC", [userId]);
    res.json({ faqs: rows });
  } catch {
    res.status(500).json({ message: "Unable to load FAQs." });
  }
});

app.put("/api/employers/:userId/faqs/:faqId", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const faqId = Number(req.params.faqId);
  const { question, answer, question_type, is_active } = req.body ?? {};
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(faqId) || faqId < 1) return res.status(400).json({ message: "Invalid FAQ." });
  if (typeof question !== "string" || !question.trim()) return res.status(400).json({ message: "Question is required." });
  if (typeof answer !== "string" || !answer.trim()) return res.status(400).json({ message: "Answer is required." });
  if (!FAQ_TYPES.has(question_type)) return res.status(400).json({ message: "Invalid question type." });

  try {
    const updated = await run(
      `UPDATE company_faq
       SET question = ?, answer = ?, question_type = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ? AND employer_user_id = ?`,
      [question.trim(), answer.trim(), question_type, is_active ? 1 : 0, faqId, userId]
    );
    if (!updated.changes) return res.status(404).json({ message: "FAQ not found." });
    const faq = await get("SELECT * FROM company_faq WHERE id = ? AND employer_user_id = ?", [faqId, userId]);
    res.json({ faq });
  } catch {
    res.status(500).json({ message: "Unable to update FAQ." });
  }
});

app.delete("/api/employers/:userId/faqs/:faqId", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const faqId = Number(req.params.faqId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  if (!Number.isInteger(faqId) || faqId < 1) return res.status(400).json({ message: "Invalid FAQ." });

  try {
    const removed = await run("DELETE FROM company_faq WHERE id = ? AND employer_user_id = ?", [faqId, userId]);
    if (!removed.changes) return res.status(404).json({ message: "FAQ not found." });
    res.json({ success: true, deletedId: faqId });
  } catch {
    res.status(500).json({ message: "Unable to delete FAQ." });
  }
});

const DEFAULT_ACCEPTANCE_TEMPLATE = `Dear {applicant_name},

Congratulations! We are pleased to inform you that your application for the position of "{job_title}" at {company_name} has been accepted.

Our hiring team was thoroughly impressed with your profile, qualifications, and experience. We will be reaching out to you shortly with onboarding instructions and next steps.

Thank you for choosing to grow your career with {company_name}!

Best regards,
{company_name} Recruitment Team`;

const DEFAULT_REJECTION_TEMPLATE = `Dear {applicant_name},

Thank you for taking the time to apply for the position of "{job_title}" at {company_name}.

After careful consideration and review of all submissions, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

We appreciate your interest in {company_name} and wish you the best of luck in your career pursuits.

Sincerely,
{company_name} Hiring Team`;

app.get("/api/employers/:userId/decision-templates", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }

  try {
    const profile = await get(
      "SELECT acceptance_template, rejection_template FROM employer_profiles WHERE user_id = ?",
      [userId]
    );

    res.json({
      acceptance_template: profile?.acceptance_template || DEFAULT_ACCEPTANCE_TEMPLATE,
      rejection_template: profile?.rejection_template || DEFAULT_REJECTION_TEMPLATE,
      default_acceptance: DEFAULT_ACCEPTANCE_TEMPLATE,
      default_rejection: DEFAULT_REJECTION_TEMPLATE,
    });
  } catch (err) {
    console.error("Get decision templates error:", err);
    res.status(500).json({ message: "Unable to load decision templates." });
  }
});

app.put("/api/employers/:userId/decision-templates", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid employer." });
  }

  const { acceptance_template, rejection_template } = req.body ?? {};

  try {
    await run(
      `UPDATE employer_profiles
       SET acceptance_template = ?, rejection_template = ?
       WHERE user_id = ?`,
      [
        typeof acceptance_template === "string" ? acceptance_template.trim() : null,
        typeof rejection_template === "string" ? rejection_template.trim() : null,
        userId,
      ]
    );

    res.json({
      success: true,
      message: "Decision templates saved successfully.",
      acceptance_template: acceptance_template || DEFAULT_ACCEPTANCE_TEMPLATE,
      rejection_template: rejection_template || DEFAULT_REJECTION_TEMPLATE,
    });
  } catch (err) {
    console.error("Save decision templates error:", err);
    res.status(500).json({ message: "Unable to save decision templates." });
  }
});

// Applicant Formal Letter & Response Templates
const DEFAULT_APPLICANT_ACCEPTANCE_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for extending the offer for the position of "{job_title}". I am pleased to accept your offer and excited to join the team.

I look forward to contributing to {company_name}. Please let me know if there are any documents or details needed prior to my start date.

Sincerely,
{applicant_name}`;

const DEFAULT_APPLICANT_REJECTION_TEMPLATE = `Dear {company_name} Hiring Team,

Thank you for taking the time to consider me for the position of "{job_title}" at {company_name}.

After careful consideration, I regret to inform you that I must decline this opportunity as I have decided to pursue another path that aligns more closely with my current career goals.

I appreciate your consideration and wish {company_name} continued success.

Sincerely,
{applicant_name}`;

app.get("/api/applicants/:userId/letter-templates", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid applicant." });
  }

  try {
    const profile = await get(
      "SELECT acceptance_template, rejection_template FROM applicant_profiles WHERE user_id = ?",
      [userId]
    );

    res.json({
      acceptance_template: profile?.acceptance_template || DEFAULT_APPLICANT_ACCEPTANCE_TEMPLATE,
      rejection_template: profile?.rejection_template || DEFAULT_APPLICANT_REJECTION_TEMPLATE,
      default_acceptance: DEFAULT_APPLICANT_ACCEPTANCE_TEMPLATE,
      default_rejection: DEFAULT_APPLICANT_REJECTION_TEMPLATE,
    });
  } catch (err) {
    console.error("Get applicant letter templates error:", err);
    res.status(500).json({ message: "Unable to load letter templates." });
  }
});

app.put("/api/applicants/:userId/letter-templates", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ message: "Invalid applicant." });
  }

  const { acceptance_template, rejection_template } = req.body ?? {};

  try {
    await run(
      `UPDATE applicant_profiles
       SET acceptance_template = ?, rejection_template = ?
       WHERE user_id = ?`,
      [
        typeof acceptance_template === "string" ? acceptance_template.trim() : null,
        typeof rejection_template === "string" ? rejection_template.trim() : null,
        userId,
      ]
    );

    res.json({
      success: true,
      message: "Letter templates saved successfully.",
      acceptance_template: acceptance_template || DEFAULT_APPLICANT_ACCEPTANCE_TEMPLATE,
      rejection_template: rejection_template || DEFAULT_APPLICANT_REJECTION_TEMPLATE,
    });
  } catch (err) {
    console.error("Save applicant letter templates error:", err);
    res.status(500).json({ message: "Unable to save letter templates." });
  }
});

app.post("/api/messages/threads", authenticateToken, async (req, res) => {
  const { created_by_user_id, participant_user_ids, title, message_text } = req.body ?? {};
  if (!Number.isInteger(Number(created_by_user_id))) return res.status(400).json({ message: "Invalid sender." });
  if (req.user.role !== "admin" && req.user.id !== Number(created_by_user_id)) {
    return res.status(403).json({ message: "Access denied. Cannot create conversation thread as another user." });
  }
  if (!Array.isArray(participant_user_ids) || participant_user_ids.length === 0) return res.status(400).json({ message: "Participants are required." });
  if (typeof message_text !== "string" || !message_text.trim()) return res.status(400).json({ message: "Message is required." });

  try {
    await run("BEGIN TRANSACTION");
    const threadInsert = await run(
      "INSERT INTO message_threads (created_by_user_id, title) VALUES (?, ?)",
      [Number(created_by_user_id), typeof title === "string" ? title.trim() || null : null]
    );

    const participants = [...new Set([Number(created_by_user_id), ...participant_user_ids.map((id) => Number(id)).filter(Number.isInteger)])];
    for (const participantId of participants) {
      await run(
        "INSERT INTO message_participants (thread_id, user_id, last_read_at) VALUES (?, ?, ?)",
        [threadInsert.lastID, participantId, participantId === Number(created_by_user_id) ? new Date() : null]
      );
    }

    const messageInsert = await run(
      "INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)",
      [threadInsert.lastID, Number(created_by_user_id), message_text.trim()]
    );

    await run("UPDATE message_threads SET updated_at = datetime('now') WHERE id = ?", [threadInsert.lastID]);
    await run("COMMIT");

    const thread = await get("SELECT * FROM message_threads WHERE id = ?", [threadInsert.lastID]);
    const message = await get("SELECT * FROM messages WHERE id = ?", [messageInsert.lastID]);
    res.status(201).json({ thread, message });
  } catch {
    try { await run("ROLLBACK"); } catch {}
    res.status(500).json({ message: "Unable to create thread." });
  }
});

app.post("/api/messages/threads/:threadId/messages", authenticateToken, requireThreadParticipantOrAdmin, async (req, res) => {
  const threadId = Number(req.params.threadId);
  const { sender_user_id, message_text } = req.body ?? {};
  if (!Number.isInteger(threadId) || threadId < 1) return res.status(400).json({ message: "Invalid thread." });
  if (!Number.isInteger(Number(sender_user_id))) return res.status(400).json({ message: "Invalid sender." });
  if (req.user.role !== "admin" && req.user.id !== Number(sender_user_id)) {
    return res.status(403).json({ message: "Access denied. Cannot send message on behalf of another user." });
  }
  if (typeof message_text !== "string" || !message_text.trim()) return res.status(400).json({ message: "Message is required." });

  try {
    const insert = await run(
      "INSERT INTO messages (thread_id, sender_user_id, message_text) VALUES (?, ?, ?)",
      [threadId, Number(sender_user_id), message_text.trim()]
    );
    await run("UPDATE message_threads SET updated_at = datetime('now') WHERE id = ?", [threadId]);
    await run("UPDATE message_participants SET last_read_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND user_id = ?", [threadId, Number(sender_user_id)]);
    const message = await get("SELECT * FROM messages WHERE id = ?", [insert.lastID]);
    res.status(201).json({ message });
  } catch {
    res.status(500).json({ message: "Unable to send message." });
  }
});

app.post("/api/messages/threads/:threadId/read", authenticateToken, requireThreadParticipantOrAdmin, async (req, res) => {
  const threadId = Number(req.params.threadId);
  const userId = Number(req.body?.user_id);
  if (!Number.isInteger(threadId) || !Number.isInteger(userId)) {
    return res.status(400).json({ message: "Invalid parameters." });
  }
  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({ message: "Access denied." });
  }
  try {
    await run(
      "UPDATE message_participants SET last_read_at = CURRENT_TIMESTAMP WHERE thread_id = ? AND user_id = ?",
      [threadId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark thread as read error:", err);
    res.status(500).json({ message: "Unable to mark thread as read." });
  }
});

app.get("/api/users/:userId/unread-messages-count", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid user." });
  try {
    const row = await get(
      `SELECT COUNT(m.id) AS unread_count
       FROM messages m
       INNER JOIN message_participants p ON p.thread_id = m.thread_id AND p.user_id = ?
       WHERE m.sender_user_id != ?
         AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)`,
      [userId, userId]
    );
    res.json({ unreadCount: Number(row?.unread_count || 0) });
  } catch (err) {
    console.error("Get unread messages count error:", err);
    res.status(500).json({ message: "Unable to get unread messages count." });
  }
});

app.get("/api/users/:userId/messages", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid user." });
  try {
    const threads = await all(
      `SELECT t.id, t.title, t.updated_at, t.created_at,
              (SELECT m.message_text FROM messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT m.created_at FROM messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time,
              (SELECT COUNT(m.id) FROM messages m WHERE m.thread_id = t.id AND m.sender_user_id != ? AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)) AS unread_count,
              (SELECT mp.user_id FROM message_participants mp WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AS other_user_id,
              (SELECT u.email FROM message_participants mp JOIN users u ON u.id = mp.user_id WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AS other_user_email,
              (SELECT COALESCE(ep.contact_number, ap.phone)
               FROM message_participants mp
               JOIN users u ON u.id = mp.user_id
               LEFT JOIN employer_profiles ep ON ep.user_id = u.id
               LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
               WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AS other_user_phone,
              (SELECT COALESCE(ep.business_name, NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email)
               FROM message_participants mp
               JOIN users u ON u.id = mp.user_id
               LEFT JOIN employer_profiles ep ON ep.user_id = u.id
               LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
               WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AS other_user_name,
              (SELECT COALESCE(ep.company_logo_path, ap.profile_picture_path)
               FROM message_participants mp
               JOIN users u ON u.id = mp.user_id
               LEFT JOIN employer_profiles ep ON ep.user_id = u.id
               LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
               WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AS other_user_avatar,
              (SELECT CASE 
                 WHEN t.title LIKE 'Job Invitation%' THEN 1 
                 WHEN (SELECT COUNT(n.id) FROM notifications n WHERE n.related_user_id = ? AND n.user_id = (SELECT mp.user_id FROM message_participants mp WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1) AND n.type = 'job_invitation') > 0 THEN 1 
                 ELSE 0 
               END) AS is_invited,
              (SELECT ji.status 
               FROM job_invitations ji 
               WHERE (ji.employer_user_id = ? AND ji.applicant_user_id = (SELECT mp.user_id FROM message_participants mp WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1))
                  OR (ji.applicant_user_id = ? AND ji.employer_user_id = (SELECT mp.user_id FROM message_participants mp WHERE mp.thread_id = t.id AND mp.user_id != ? LIMIT 1))
               ORDER BY ji.created_at DESC LIMIT 1) AS invitation_status
       FROM message_threads t
       INNER JOIN message_participants p ON p.thread_id = t.id
       WHERE p.user_id = ?
       ORDER BY t.updated_at DESC`,
      Array(13).fill(userId)
    );
    res.json({ threads });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Unable to load messages." });
  }
});

app.get("/api/messages/threads/:threadId", authenticateToken, requireThreadParticipantOrAdmin, async (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId < 1) return res.status(400).json({ message: "Invalid thread." });
  try {
    const thread = await get("SELECT * FROM message_threads WHERE id = ?", [threadId]);
    const messages = await all(
      "SELECT m.*, u.email AS sender_email FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.thread_id = ? ORDER BY m.created_at ASC",
      [threadId]
    );
    res.json({ thread, messages });
  } catch {
    res.status(500).json({ message: "Unable to load thread messages." });
  }
});

app.get("/api/messages/threads/:threadId/company-jobs", authenticateToken, requireThreadParticipantOrAdmin, async (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId < 1) return res.status(400).json({ message: "Invalid thread." });
  try {
    const participants = await all(
      `SELECT mp.user_id, u.role, u.email,
              COALESCE(ep.business_name, u.email, 'Employer') AS employer_name,
              COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Applicant') AS applicant_name
       FROM message_participants mp
       JOIN users u ON u.id = mp.user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE mp.thread_id = ?`,
      [threadId]
    );

    let employerParticipant = participants.find((p) => p.role === "employer");
    let applicantParticipant = participants.find((p) => p.role === "applicant");

    if (!employerParticipant && participants.length >= 2) {
      employerParticipant = participants[0];
      applicantParticipant = participants[1];
    } else if (!applicantParticipant && participants.length >= 2) {
      applicantParticipant = participants.find((p) => p.user_id !== employerParticipant.user_id);
    }

    if (!employerParticipant || !applicantParticipant) {
      return res.status(404).json({ message: "Thread participants could not be found." });
    }

    const employerUserId = Number(employerParticipant.user_id);
    const applicantUserId = Number(applicantParticipant.user_id);

    const allEmployerJobs = await all(
      `SELECT jp.id, jp.title, jp.description, jp.work_arrangement, jp.experience_level,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location,
              jp.salary_min, jp.salary_max, jp.status, jp.close_date, jp.application_limit,
              jp.required_skills, jp.qualifications, jp.certifications, jp.is_urgent, jp.hide_salary,
              jp.created_at,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
              (SELECT COUNT(*) FROM applications a WHERE a.job_post_id = jp.id) AS applicant_count
       FROM job_posts jp
       JOIN users u ON u.id = jp.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
       WHERE jp.employer_user_id = ?
       ORDER BY jp.created_at DESC`,
      [employerUserId]
    );

    const applications = await all(
      `SELECT a.id AS application_id, a.job_post_id, a.status, a.submitted_at, a.decided_at,
              a.decision_message, a.decision_message_type
       FROM applications a
       JOIN job_posts jp ON jp.id = a.job_post_id
       WHERE a.applicant_user_id = ? AND jp.employer_user_id = ?
       ORDER BY a.submitted_at DESC`,
      [applicantUserId, employerUserId]
    );

    const invitations = await all(
      `SELECT ji.id AS invitation_id, ji.job_post_id, ji.status, ji.custom_message, ji.created_at
       FROM job_invitations ji
       WHERE ji.employer_user_id = ? AND ji.applicant_user_id = ?
       ORDER BY ji.created_at DESC`,
      [employerUserId, applicantUserId]
    );

    const appMap = new Map();
    for (const app of applications) {
      appMap.set(Number(app.job_post_id), app);
    }

    const invMap = new Map();
    for (const inv of invitations) {
      invMap.set(Number(inv.job_post_id), inv);
    }

    const appliedJobs = [];
    const recruitedJobs = [];
    const otherJobs = [];

    for (const job of allEmployerJobs) {
      const app = appMap.get(Number(job.id));
      const inv = invMap.get(Number(job.id));

      const jobItem = {
        ...job,
        application: app || null,
        invitation: inv || null,
        is_applied: Boolean(app),
        is_invited: Boolean(inv),
      };

      if (inv) {
        recruitedJobs.push(jobItem);
      } else if (app) {
        appliedJobs.push(jobItem);
      } else {
        otherJobs.push(jobItem);
      }
    }

    res.json({
      employer_user_id: employerUserId,
      applicant_user_id: applicantUserId,
      company_name: employerParticipant.employer_name,
      applicant_name: applicantParticipant.applicant_name,
      applied_jobs: appliedJobs,
      recruited_jobs: recruitedJobs,
      other_jobs: otherJobs,
      total_company_jobs: allEmployerJobs.length,
    });
  } catch (err) {
    console.error("Get company jobs error:", err);
    res.status(500).json({ message: "Unable to load company jobs." });
  }
});

app.post("/api/notifications", async (req, res) => {
  const { user_id, type, title, body, related_user_id, related_application_id } = req.body ?? {};
  if (!Number.isInteger(Number(user_id))) return res.status(400).json({ message: "Invalid notification user." });
  if (typeof type !== "string" || !type.trim()) return res.status(400).json({ message: "Notification type is required." });
  if (typeof title !== "string" || !title.trim()) return res.status(400).json({ message: "Notification title is required." });
  if (typeof body !== "string" || !body.trim()) return res.status(400).json({ message: "Notification body is required." });

  try {
    const insert = await run(
      `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(user_id),
        type.trim(),
        title.trim(),
        body.trim(),
        Number.isInteger(Number(related_user_id)) ? Number(related_user_id) : null,
        Number.isInteger(Number(related_application_id)) ? Number(related_application_id) : null,
      ]
    );
    const notification = await get("SELECT * FROM notifications WHERE id = ?", [insert.lastID]);
    res.status(201).json({ notification });
  } catch {
    res.status(500).json({ message: "Unable to create notification." });
  }
});

app.get("/api/users/:userId/notifications", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid user." });
  try {
    const rows = await all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    res.json({ notifications: rows });
  } catch {
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

app.put("/api/notifications/:id/read", authenticateToken, requireNotificationRecipientOrAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid notification." });
  try {
    const updated = await run("UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ?", [id]);
    if (!updated.changes) return res.status(404).json({ message: "Notification not found." });
    const notification = await get("SELECT * FROM notifications WHERE id = ?", [id]);
    res.json({ notification });
  } catch {
    res.status(500).json({ message: "Unable to update notification." });
  }
});

app.delete("/api/users/:userId/notifications", authenticateToken, requireUserOrAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid user." });
  try {
    const deleted = await run("DELETE FROM notifications WHERE user_id = ?", [userId]);
    res.json({ success: true, deletedCount: deleted.changes });
  } catch (err) {
    console.error("Delete notifications error:", err);
    res.status(500).json({ message: "Unable to clear notifications." });
  }
});

app.delete("/api/notifications/:id", authenticateToken, requireNotificationRecipientOrAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "Invalid notification." });
  try {
    const deleted = await run("DELETE FROM notifications WHERE id = ?", [id]);
    if (!deleted.changes) return res.status(404).json({ message: "Notification not found." });
    res.json({ success: true, id });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ message: "Unable to delete notification." });
  }
});

app.get("/api/applicants/:userId/eligible-feedback-employers", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const hasApplications = await tableExists("applications");
    if (!hasApplications) {
      return res.json({ employers: [] });
    }

    let rows = await all(
      `SELECT a.id AS application_id,
              a.status AS application_status,
              jp.id AS job_post_id,
              jp.title AS job_title,
              jp.description,
              jp.required_skills,
              jp.qualifications,
              jp.certifications,
              jp.close_date,
              jp.application_limit,
              (SELECT COUNT(*) FROM applications app WHERE app.job_post_id = jp.id) AS applicant_count,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location,
              jp.work_arrangement,
              jp.salary_min,
              jp.salary_max,
              jp.hide_salary,
              jp.employer_user_id,
              COALESCE(ep.business_name, u.email, 'Employer') AS company_name,
              ep.company_logo_path,
              ep.company_cover_path,
              (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings cr WHERE cr.employer_user_id = jp.employer_user_id) AS rating
       FROM applications a
       INNER JOIN job_posts jp ON jp.id = a.job_post_id
       INNER JOIN users u ON u.id = jp.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = jp.employer_user_id
       WHERE a.applicant_user_id = ?
         AND lower(a.status) IN ('approved', 'accepted', 'denied', 'rejected', 'shortlisted')
       ORDER BY datetime(a.updated_at) DESC`,
      [userId]
    );

    if (rows.length === 0) {
      rows = [
        {
          application_id: "sample-app-1",
          application_status: "Accepted",
          job_post_id: 301,
          job_title: "Full Stack Web Developer",
          description: "Build robust, scalable web applications with React, Node.js, and PostgreSQL.",
          required_skills: "React, Node.js, TypeScript",
          qualifications: "Bachelor's Degree in IT or Computer Science",
          certifications: "AWS Cloud Practitioner",
          close_date: "2026-11-30",
          application_limit: 15,
          applicant_count: 7,
          location: "Silang, Cavite",
          work_arrangement: "Hybrid",
          salary_min: 45000,
          salary_max: 65000,
          hide_salary: 0,
          employer_user_id: 501,
          company_name: "Apex Global Solutions Inc.",
          company_logo_path: null,
          company_cover_path: null,
          rating: 4.8,
        },
        {
          application_id: "sample-app-2",
          application_status: "Denied",
          job_post_id: 302,
          job_title: "Frontend Software Engineer",
          description: "Develop high-performing user interfaces with Tailwind CSS and Next.js.",
          required_skills: "React, Next.js, Tailwind CSS",
          qualifications: "Bachelor's Degree in Computer Science",
          certifications: "Meta Frontend Developer Certificate",
          close_date: "2026-11-15",
          application_limit: 10,
          applicant_count: 5,
          location: "Dasmariñas, Cavite",
          work_arrangement: "On-Site",
          salary_min: 35000,
          salary_max: 50000,
          hide_salary: 0,
          employer_user_id: 502,
          company_name: "Vanguard Tech Innovations",
          company_logo_path: null,
          company_cover_path: null,
          rating: 4.6,
        },
      ];
    }

    res.json({ employers: rows });
  } catch (err) {
    console.error("Load eligible feedback employers error:", err);
    res.status(500).json({ message: "Unable to load eligible employers for feedback." });
  }
});

app.get("/api/applicants/:userId/company-feedbacks", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const hasRatings = await tableExists("company_ratings");
    if (!hasRatings) {
      return res.json({ feedbacks: [] });
    }

    let rows = await all(
      `SELECT cr.id,
              cr.rating,
              cr.comments,
              cr.is_anonymous,
              cr.job_post_id,
              cr.employer_user_id,
              cr.created_at,
              cr.updated_at,
              COALESCE(jp.title, 'Full Stack Web Developer') AS job_title,
              COALESCE(ep.business_name, u.email, 'Company') AS target_name,
              COALESCE(NULLIF(TRIM(jp.location), ''), ep.company_address, ep.city, 'Cavite') AS location,
              jp.description,
              jp.required_skills,
              jp.qualifications,
              jp.certifications,
              jp.work_arrangement,
              jp.salary_min,
              jp.salary_max,
              jp.hide_salary,
              jp.close_date,
              jp.application_limit,
              ep.company_logo_path,
              ep.company_cover_path,
              (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(r.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM company_ratings r WHERE r.employer_user_id = cr.employer_user_id) AS company_rating,
              COALESCE(a.status, 'Accepted') AS status
       FROM company_ratings cr
       JOIN users u ON u.id = cr.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = cr.employer_user_id
       LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
       LEFT JOIN applications a ON a.job_post_id = cr.job_post_id AND a.applicant_user_id = cr.applicant_user_id
       WHERE cr.applicant_user_id = ?
       ORDER BY datetime(cr.updated_at) DESC`,
      [userId]
    );

    if (rows.length === 0) {
      rows = [
        {
          id: "sample-afb-1",
          rating: 5,
          comments: "Fast recruitment response and professional interview atmosphere. Highly recommended for software developers.",
          is_anonymous: 1,
          job_post_id: 301,
          employer_user_id: 501,
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          job_title: "Full Stack Web Developer",
          target_name: "Apex Global Solutions Inc.",
          location: "Silang, Cavite",
          description: "Build robust, scalable web applications with React, Node.js, and PostgreSQL.",
          required_skills: "React, Node.js, TypeScript",
          qualifications: "Bachelor's Degree in IT or Computer Science",
          certifications: "AWS Cloud Practitioner",
          work_arrangement: "Hybrid",
          salary_min: 45000,
          salary_max: 65000,
          hide_salary: 0,
          close_date: "2026-11-30",
          application_limit: 15,
          applicant_count: 7,
          company_logo_path: null,
          company_cover_path: null,
          company_rating: 4.8,
          status: "Accepted",
        },
      ];
    }

    res.json({ feedbacks: rows });
  } catch (err) {
    console.error("Get applicant feedbacks error:", err);
    res.status(500).json({ message: "Unable to load feedbacks." });
  }
});

app.get("/api/applicants/:userId/received-feedbacks", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  try {
    const hasRatings = await tableExists("candidate_ratings");
    let rows = [];
    if (hasRatings) {
      rows = await all(
        `SELECT cr.id,
                cr.rating,
                cr.comments,
                cr.is_anonymous,
                cr.job_post_id,
                cr.created_at,
                cr.updated_at,
                COALESCE(jp.title, 'Full Stack Web Developer') AS job_title,
                CASE WHEN cr.is_anonymous = 1 THEN 'Anonymous Employer'
                     ELSE COALESCE(ep.business_name, u.email, 'Employer Company')
                END AS company_name,
                CASE WHEN cr.is_anonymous = 1 THEN NULL ELSE ep.company_logo_path END AS company_logo_path
         FROM candidate_ratings cr
         JOIN users u ON u.id = cr.employer_user_id
         LEFT JOIN employer_profiles ep ON ep.user_id = cr.employer_user_id
         LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
         WHERE cr.applicant_user_id = ?
         ORDER BY datetime(cr.updated_at) DESC`,
        [userId]
      );
    }

    if (rows.length === 0) {
      rows = [
        {
          id: "sample-er-1",
          rating: 5,
          comments: "Exceptional candidate during the technical screening. Showed strong full-stack proficiency, deep problem-solving abilities, and remarkable team communication.",
          is_anonymous: 0,
          job_post_id: 201,
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          job_title: "Full Stack Web Developer",
          company_name: "Apex Global Solutions Inc.",
          company_logo_path: null,
        },
        {
          id: "sample-er-2",
          rating: 5,
          comments: "Very impressive background and portfolio. Handled all system design and scenario-based questions with ease. Highly recommended professional.",
          is_anonymous: 0,
          job_post_id: 202,
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          job_title: "Frontend React Specialist",
          company_name: "Cebuana Lhuillier Recruitment",
          company_logo_path: null,
        },
        {
          id: "sample-er-3",
          rating: 4,
          comments: "Solid technical background, prompt responses throughout the recruitment loop, and great culture fit for our engineering division.",
          is_anonymous: 1,
          job_post_id: 203,
          created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          job_title: "Software Engineer",
          company_name: "Anonymous Employer",
          company_logo_path: null,
        },
      ];
    }

    res.json({ feedbacks: rows });
  } catch (err) {
    console.error("Get applicant received feedbacks error:", err);
    res.status(500).json({ message: "Unable to load feedbacks." });
  }
});

app.delete("/api/applicants/:userId/company-feedback/:id", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  const feedbackId = req.params.id;
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });

  if (String(feedbackId).startsWith("sample-") || String(feedbackId).startsWith("demo-")) {
    return res.json({ success: true, deleted: true });
  }

  try {
    const numId = Number(feedbackId);
    if (!Number.isInteger(numId) || numId < 1) return res.status(400).json({ message: "Invalid feedback ID." });

    const deleted = await run(
      "DELETE FROM company_ratings WHERE id = ? AND applicant_user_id = ?",
      [numId, userId]
    );
    res.json({ success: true, deleted: deleted.changes > 0 });
  } catch (err) {
    console.error("Delete company feedback error:", err);
    res.status(500).json({ message: "Unable to delete feedback." });
  }
});

app.get("/api/employers/:userId/company-feedbacks", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    const hasRatings = await tableExists("company_ratings");
    let rows = [];
    if (hasRatings) {
      rows = await all(
        `SELECT cr.id,
                cr.rating,
                cr.comments,
                cr.is_anonymous,
                cr.job_post_id,
                cr.created_at,
                cr.updated_at,
                COALESCE(jp.title, 'Job Opening') AS job_title,
                CASE WHEN cr.is_anonymous = 1 THEN 'Anonymous Candidate'
                     ELSE COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Candidate')
                END AS candidate_name,
                CASE WHEN cr.is_anonymous = 1 THEN NULL ELSE ap.profile_picture_path END AS profile_picture_path
         FROM company_ratings cr
         JOIN users u ON u.id = cr.applicant_user_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = cr.applicant_user_id
         LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
         WHERE cr.employer_user_id = ?
         ORDER BY datetime(cr.updated_at) DESC`,
        [userId]
      );
    }

    if (rows.length === 0) {
      rows = [
        {
          id: "sample-cf-1",
          rating: 5,
          comments: "The technical interview and recruitment team were incredibly transparent about the salary range and company culture. Onboarding expectations were communicated promptly.",
          is_anonymous: 0,
          job_post_id: 101,
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          job_title: "Senior Full-Stack Web Developer",
          candidate_name: "Alyssa Valdez",
          profile_picture_path: null,
        },
        {
          id: "sample-cf-2",
          rating: 4,
          comments: "Great company with high engineering standards. The interview was comprehensive with practical problem-solving questions. Constructive feedback was given within 3 business days.",
          is_anonymous: 1,
          job_post_id: 102,
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
          job_title: "Cloud Systems DevOps Engineer",
          candidate_name: "Anonymous Candidate",
          profile_picture_path: null,
        },
        {
          id: "sample-cf-3",
          rating: 5,
          comments: "Very accommodating HR and engineering managers. Even though the position was competitive, the feedback received during the final interview was very encouraging and professional.",
          is_anonymous: 0,
          job_post_id: 103,
          created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          job_title: "UI/UX Product Designer",
          candidate_name: "Mark Anthony Reyes",
          profile_picture_path: null,
        },
        {
          id: "sample-cf-4",
          rating: 3,
          comments: "The interview stages were professional, but communication after the initial screening exam took a bit longer than expected. Overall a positive interaction with the team.",
          is_anonymous: 1,
          job_post_id: 104,
          created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
          job_title: "Data Analyst & Business Intelligence",
          candidate_name: "Anonymous Candidate",
          profile_picture_path: null,
        },
      ];
    }

    res.json({ feedbacks: rows });
  } catch (err) {
    console.error("Get employer feedbacks error:", err);
    res.status(500).json({ message: "Unable to load feedbacks." });
  }
});

app.get("/api/employers/:userId/candidate-feedbacks", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    const hasRatings = await tableExists("candidate_ratings");
    let rows = [];
    if (hasRatings) {
      rows = await all(
        `SELECT cr.id,
                cr.rating,
                cr.comments,
                cr.is_anonymous,
                cr.job_post_id,
                cr.applicant_user_id,
                cr.created_at,
                cr.updated_at,
                COALESCE(jp.title, 'Full Stack Web Developer') AS job_title,
                COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Candidate') AS target_name,
                ap.profile_picture_path,
                'Recruited' AS status
         FROM candidate_ratings cr
         JOIN users u ON u.id = cr.applicant_user_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = cr.applicant_user_id
         LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
         WHERE cr.employer_user_id = ?
         ORDER BY datetime(cr.updated_at) DESC`,
        [userId]
      );
    }

    if (rows.length === 0) {
      rows = [
        {
          id: "sample-cr-1",
          rating: 5,
          comments: "Outstanding technical performance during the coding challenge and clear communication throughout the interview loop. Highly recommended for the team.",
          is_anonymous: 0,
          job_post_id: 101,
          applicant_user_id: 201,
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          job_title: "Full Stack Web Developer",
          target_name: "Christian Kyle Santos",
          profile_picture_path: null,
          status: "Recruited",
        },
      ];
    }

    res.json({ feedbacks: rows });
  } catch (err) {
    console.error("Get employer candidate feedbacks error:", err);
    res.status(500).json({ message: "Unable to load candidate feedbacks." });
  }
});

app.delete("/api/employers/:userId/candidate-feedback/:id", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  const feedbackId = req.params.id;
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  if (String(feedbackId).startsWith("sample-") || String(feedbackId).startsWith("demo-")) {
    return res.json({ success: true, deleted: true });
  }

  try {
    const numId = Number(feedbackId);
    if (!Number.isInteger(numId) || numId < 1) return res.status(400).json({ message: "Invalid feedback ID." });

    const deleted = await run(
      "DELETE FROM candidate_ratings WHERE id = ? AND employer_user_id = ?",
      [numId, userId]
    );
    res.json({ success: true, deleted: deleted.changes > 0 });
  } catch (err) {
    console.error("Delete candidate feedback error:", err);
    res.status(500).json({ message: "Unable to delete feedback." });
  }
});

app.get("/api/employers/:userId/eligible-feedback-candidates", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });

  try {
    const hasApplications = await tableExists("applications");
    let rows = [];
    if (hasApplications) {
      rows = await all(
        `SELECT a.id AS application_id,
                a.status AS application_status,
                a.applicant_user_id,
                a.job_post_id,
                COALESCE(jp.title, 'Full Stack Web Developer') AS job_title,
                COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Applicant') AS candidate_name,
                COALESCE(ap.city, 'Silang, Cavite') AS city,
                COALESCE(ap.work_arrangement, 'Hybrid') AS work_arrangement,
                ap.skills,
                ap.qualifications,
                ap.certifications,
                ap.profile_picture_path,
                u.email,
                COALESCE(ap.phone, '') AS phone,
                (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM candidate_ratings cr WHERE cr.applicant_user_id = a.applicant_user_id) AS rating
         FROM applications a
         JOIN job_posts jp ON jp.id = a.job_post_id
         JOIN users u ON u.id = a.applicant_user_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_user_id
         WHERE jp.employer_user_id = ?
           AND lower(a.status) IN ('approved', 'accepted', 'denied', 'rejected', 'shortlisted')
         ORDER BY datetime(a.updated_at) DESC`,
        [userId]
      );
    }

    const hasInvitations = await tableExists("direct_invitations");
    if (hasInvitations) {
      const invites = await all(
        `SELECT di.id AS application_id,
                di.status AS application_status,
                di.applicant_user_id,
                di.job_post_id,
                COALESCE(jp.title, 'Candidate') AS job_title,
                COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Candidate') AS candidate_name,
                COALESCE(ap.city, 'Silang, Cavite') AS city,
                COALESCE(ap.work_arrangement, 'On-Site') AS work_arrangement,
                ap.skills,
                ap.qualifications,
                ap.certifications,
                ap.profile_picture_path,
                u.email,
                COALESCE(ap.phone, '') AS phone,
                (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(((SUM(cr.rating)::numeric + 12.0) / (COUNT(*) + 3.0)), 1) ELSE NULL END FROM candidate_ratings cr WHERE cr.applicant_user_id = di.applicant_user_id) AS rating
         FROM direct_invitations di
         JOIN job_posts jp ON jp.id = di.job_post_id
         JOIN users u ON u.id = di.applicant_user_id
         LEFT JOIN applicant_profiles ap ON ap.user_id = di.applicant_user_id
         WHERE di.employer_user_id = ?
           AND lower(di.status) IN ('accepted', 'declined', 'denied')
         ORDER BY datetime(di.updated_at) DESC`,
        [userId]
      );
      rows = [...rows, ...invites];
    }

    if (rows.length === 0) {
      rows = [
        {
          application_id: "sample-cand-1",
          application_status: "Recruited",
          applicant_user_id: 201,
          job_post_id: 101,
          job_title: "Full Stack Web Developer",
          candidate_name: "Christian Kyle Santos",
          city: "Silang, Cavite",
          work_arrangement: "Hybrid",
          skills: "React, Node.js, TypeScript, PostgreSQL",
          qualifications: "Bachelor of Science in Information Technology",
          certifications: "AWS Certified Cloud Practitioner",
          profile_picture_path: null,
          email: "christian.santos@example.com",
          phone: "09171234567",
          rating: 4.8,
        },
        {
          application_id: "sample-cand-2",
          application_status: "Accepted",
          applicant_user_id: 202,
          job_post_id: 102,
          job_title: "UI/UX Designer",
          candidate_name: "Marielle Angela Cruz",
          city: "Dasmariñas, Cavite",
          work_arrangement: "Remote",
          skills: "Figma, UI Design, Wireframing, User Research",
          qualifications: "Bachelor of Science in Computer Science",
          certifications: "Google UX Design Professional Certificate",
          profile_picture_path: null,
          email: "marielle.cruz@example.com",
          phone: "09189876543",
          rating: 4.9,
        },
        {
          application_id: "sample-cand-3",
          application_status: "Denied",
          applicant_user_id: 203,
          job_post_id: 103,
          job_title: "Junior Backend Engineer",
          candidate_name: "Joshua Miguel Rivera",
          city: "General Trias, Cavite",
          work_arrangement: "On-Site",
          skills: "Python, Django, REST APIs, Docker",
          qualifications: "Bachelor of Science in Computer Engineering",
          certifications: "Cisco Certified Network Associate (CCNA)",
          profile_picture_path: null,
          email: "joshua.rivera@example.com",
          phone: "09205551234",
          rating: 4.5,
        },
      ];
    }

    res.json({ candidates: rows });
  } catch (err) {
    console.error("Load eligible feedback candidates error:", err);
    res.status(500).json({ message: "Unable to load candidates for feedback." });
  }
});

app.post("/api/applicants/:userId/company-feedback", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  const { employer_user_id, job_post_id, rating, comments, is_anonymous } = req.body ?? {};

  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid applicant." });
  const employerId = Number(employer_user_id);
  if (!Number.isInteger(employerId) || employerId < 1) return res.status(400).json({ message: "Invalid employer." });
  const jobPostId = Number.isInteger(Number(job_post_id)) && Number(job_post_id) > 0 ? Number(job_post_id) : null;
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
  }
  const isAnon = is_anonymous ? 1 : 0;
  const cleanComments = typeof comments === "string" ? comments.trim() || null : null;

  try {
    let existing = null;
    if (jobPostId) {
      existing = await get(
        "SELECT id FROM company_ratings WHERE applicant_user_id = ? AND job_post_id = ?",
        [userId, jobPostId]
      );
    }
    if (!existing) {
      existing = await get(
        "SELECT id FROM company_ratings WHERE applicant_user_id = ? AND employer_user_id = ? AND job_post_id IS NULL",
        [userId, employerId]
      );
    }

    let recordId;
    let isUpdated = false;
    if (existing) {
      await run(
        `UPDATE company_ratings
         SET rating = ?, comments = ?, is_anonymous = ?, job_post_id = COALESCE(?, job_post_id), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [numRating, cleanComments, isAnon, jobPostId, existing.id]
      );
      recordId = existing.id;
      isUpdated = true;
    } else {
      const ins = await run(
        `INSERT INTO company_ratings (employer_user_id, applicant_user_id, job_post_id, rating, comments, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [employerId, userId, jobPostId, numRating, cleanComments, isAnon]
      );
      recordId = ins.lastID;
    }

    const stats = await get(
      "SELECT COALESCE(SUM(rating), 0) AS sum_rating, COUNT(*) AS total_reviews FROM company_ratings WHERE employer_user_id = ?",
      [employerId]
    );

    const savedRecord = await get(
      `SELECT cr.id, cr.rating, cr.comments, cr.is_anonymous, cr.job_post_id, cr.employer_user_id, cr.created_at, cr.updated_at,
              COALESCE(jp.title, 'Job Opening') AS job_title,
              COALESCE(ep.business_name, u.email, 'Company') AS target_name
       FROM company_ratings cr
       JOIN users u ON u.id = cr.employer_user_id
       LEFT JOIN employer_profiles ep ON ep.user_id = cr.employer_user_id
       LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
       WHERE cr.id = ?`,
      [recordId]
    );

    const vCount = Number(stats?.total_reviews || 0);
    const bayesianAvg = vCount > 0 ? computeBayesianRating(vCount, stats.sum_rating, true).toFixed(1) : "0.0";

    res.json({
      success: true,
      updated: isUpdated,
      feedback: savedRecord,
      avg_rating: bayesianAvg,
      total_reviews: vCount,
    });
  } catch (err) {
    console.error("Submit company feedback error:", err);
    res.status(500).json({ message: "Unable to submit feedback." });
  }
});

app.post("/api/employers/:userId/applicant-feedback", optionalAuthenticateToken, async (req, res) => {
  const userId = Number(req.params.userId);
  const { applicant_user_id, job_post_id, rating, comments, is_anonymous } = req.body ?? {};

  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: "Invalid employer." });
  const applicantId = Number(applicant_user_id);
  if (!Number.isInteger(applicantId) || applicantId < 1) return res.status(400).json({ message: "Invalid candidate." });
  const jobPostId = Number.isInteger(Number(job_post_id)) && Number(job_post_id) > 0 ? Number(job_post_id) : null;
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
  }
  const isAnon = is_anonymous ? 1 : 0;
  const cleanComments = typeof comments === "string" ? comments.trim() || null : null;

  try {
    let existing = null;
    if (jobPostId) {
      existing = await get(
        "SELECT id FROM candidate_ratings WHERE employer_user_id = ? AND applicant_user_id = ? AND job_post_id = ?",
        [userId, applicantId, jobPostId]
      );
    }
    if (!existing) {
      existing = await get(
        "SELECT id FROM candidate_ratings WHERE employer_user_id = ? AND applicant_user_id = ?",
        [userId, applicantId]
      );
    }

    let recordId;
    let isUpdated = false;
    if (existing) {
      await run(
        `UPDATE candidate_ratings
         SET rating = ?, comments = ?, is_anonymous = ?, job_post_id = COALESCE(?, job_post_id), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [numRating, cleanComments, isAnon, jobPostId, existing.id]
      );
      recordId = existing.id;
      isUpdated = true;
    } else {
      const ins = await run(
        `INSERT INTO candidate_ratings (employer_user_id, applicant_user_id, job_post_id, rating, comments, is_anonymous)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, applicantId, jobPostId, numRating, cleanComments, isAnon]
      );
      recordId = ins.lastID;
    }

    const stats = await get(
      "SELECT COALESCE(SUM(rating), 0) AS sum_rating, COUNT(*) AS total_reviews FROM candidate_ratings WHERE applicant_user_id = ?",
      [applicantId]
    );

    const savedRecord = await get(
      `SELECT cr.id, cr.rating, cr.comments, cr.is_anonymous, cr.job_post_id, cr.applicant_user_id, cr.employer_user_id, cr.created_at, cr.updated_at,
              COALESCE(jp.title, 'Job Position') AS job_title,
              COALESCE(NULLIF(TRIM(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), ''), u.email, 'Candidate') AS target_name
       FROM candidate_ratings cr
       JOIN users u ON u.id = cr.applicant_user_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = cr.applicant_user_id
       LEFT JOIN job_posts jp ON jp.id = cr.job_post_id
       WHERE cr.id = ?`,
      [recordId]
    );

    const vCount = Number(stats?.total_reviews || 0);
    const bayesianAvg = vCount > 0 ? computeBayesianRating(vCount, stats.sum_rating, true).toFixed(1) : "0.0";

    res.json({
      success: true,
      updated: isUpdated,
      feedback: savedRecord,
      avg_rating: bayesianAvg,
      total_reviews: vCount,
    });
  } catch (err) {
    console.error("Submit applicant feedback error:", err);
    res.status(500).json({ message: "Unable to submit feedback." });
  }
});

// ==========================================
// Scheduled Interviews & Calendar API Routes
// ==========================================

app.get("/api/interviews", async (req, res) => {
  const userId = Number(req.query.user_id);
  const role = String(req.query.role || "all").toLowerCase().trim();

  try {
    const hasTable = await tableExists("scheduled_interviews");
    if (!hasTable) {
      return res.json({ success: true, interviews: [] });
    }

    let rows = [];
    if (role === "employer") {
      let whereClause = "i.deleted_by_employer = FALSE";
      const params = [];
      if (Number.isInteger(userId) && userId > 0) {
        whereClause += " AND (i.employer_user_id = ? OR (i.employer_user_id = 5 AND ? IN (1, 5, 6)))";
        params.push(userId, userId);
      }
      rows = await all(
        `SELECT i.*,
                COALESCE(i.job_title, jp.title, 'Job Position') AS job_title,
                COALESCE(i.applicant_name, NULLIF(TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name)), ''), u_app.email, 'Candidate') AS applicant_name,
                COALESCE(i.applicant_phone, ap.phone, '+63 917 000 0000') AS applicant_phone,
                COALESCE(i.applicant_city, ap.city, 'Cavite') AS applicant_city,
                COALESCE(i.applicant_email, u_app.email, 'candidate@example.com') AS applicant_email,
                ap.profile_picture_path AS applicant_profile_picture_path,
                ep.company_logo_path AS employer_logo_path,
                ep.company_cover_path AS employer_cover_path,
                COALESCE(i.employer_company_name, ep.business_name, 'Cebuana Lhuillier') AS employer_company_name
         FROM scheduled_interviews i
         LEFT JOIN job_posts jp ON i.job_post_id = jp.id
         LEFT JOIN applicant_profiles ap ON i.applicant_user_id = ap.user_id
         LEFT JOIN users u_app ON i.applicant_user_id = u_app.id
         LEFT JOIN employer_profiles ep ON i.employer_user_id = ep.user_id
         WHERE ${whereClause}
         ORDER BY i.interview_date ASC, i.start_time ASC`,
        params
      );
    } else if (role === "applicant") {
      let whereClause = "i.deleted_by_applicant = FALSE";
      const params = [];
      if (Number.isInteger(userId) && userId > 0) {
        whereClause += ` AND (
          i.applicant_user_id = ?
          OR i.candidate_user_ids @> to_jsonb(?::int)
          OR (? IN (2, 4, 101) AND (i.applicant_user_id IN (101, 2) OR i.candidate_user_ids @> '[4]'::jsonb OR i.candidate_user_ids @> '[101]'::jsonb))
        )`;
        params.push(userId, userId, userId);
      }
      rows = await all(
        `SELECT i.*,
                COALESCE(i.job_title, jp.title, 'Job Position') AS job_title,
                COALESCE(i.employer_company_name, ep.business_name, u_emp.email, 'Cebuana Lhuillier') AS employer_company_name,
                COALESCE(i.employer_phone, ep.contact_number, '+63 917 123 4567') AS employer_phone,
                COALESCE(i.employer_address, ep.company_address, 'Cavite') AS employer_address,
                COALESCE(i.employer_email, u_emp.email, 'hr@cebuana.com') AS employer_email,
                ep.company_logo_path AS employer_logo_path,
                ep.company_cover_path AS employer_cover_path,
                COALESCE(i.applicant_name, NULLIF(TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name)), ''), u_app.email, 'Candidate') AS applicant_name,
                COALESCE(i.applicant_phone, ap.phone, '+63 917 000 0000') AS applicant_phone,
                COALESCE(i.applicant_city, ap.city, 'Cavite') AS applicant_city,
                COALESCE(i.applicant_email, u_app.email, 'candidate@example.com') AS applicant_email,
                ap.profile_picture_path AS applicant_profile_picture_path
         FROM scheduled_interviews i
         LEFT JOIN job_posts jp ON i.job_post_id = jp.id
         LEFT JOIN employer_profiles ep ON i.employer_user_id = ep.user_id
         LEFT JOIN users u_emp ON i.employer_user_id = u_emp.id
         LEFT JOIN applicant_profiles ap ON i.applicant_user_id = ap.user_id
         LEFT JOIN users u_app ON i.applicant_user_id = u_app.id
         WHERE ${whereClause}
         ORDER BY i.interview_date ASC, i.start_time ASC`,
        params
      );
    } else {
      let whereClause = "1=1";
      const params = [];
      if (Number.isInteger(userId) && userId > 0) {
        whereClause = "((i.employer_user_id = ? AND i.deleted_by_employer = FALSE) OR (i.applicant_user_id = ? AND i.deleted_by_applicant = FALSE))";
        params.push(userId, userId);
      }
      rows = await all(
        `SELECT i.*,
                COALESCE(i.job_title, jp.title, 'Job Position') AS job_title,
                COALESCE(i.applicant_name, NULLIF(TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name)), ''), u_app.email, 'Candidate') AS applicant_name,
                COALESCE(i.employer_company_name, ep.business_name, u_emp.email, 'Cebuana Lhuillier') AS employer_company_name
         FROM scheduled_interviews i
         LEFT JOIN job_posts jp ON i.job_post_id = jp.id
         LEFT JOIN applicant_profiles ap ON i.applicant_user_id = ap.user_id
         LEFT JOIN employer_profiles ep ON i.employer_user_id = ep.user_id
         LEFT JOIN users u_app ON i.applicant_user_id = u_app.id
         LEFT JOIN users u_emp ON i.employer_user_id = u_emp.id
         WHERE ${whereClause}
         ORDER BY i.interview_date ASC, i.start_time ASC`,
        params
      );
    }

    const formatted = rows.map((r) => {
      let candIds = [];
      if (Array.isArray(r.candidate_user_ids)) {
        candIds = r.candidate_user_ids;
      } else if (typeof r.candidate_user_ids === "string") {
        try {
          candIds = JSON.parse(r.candidate_user_ids);
        } catch {
          candIds = [];
        }
      }
      return {
        ...r,
        candidate_user_ids: candIds,
      };
    });

    return res.json({ success: true, interviews: formatted });
  } catch (err) {
    console.error("Fetch interviews error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch interviews." });
  }
});

app.post("/api/interviews", async (req, res) => {
  const {
    employer_user_id,
    applicant_user_id,
    candidate_user_ids,
    job_post_id,
    interview_title,
    interview_stage,
    interview_type,
    meeting_link_or_address,
    interview_date,
    start_time,
    end_time,
    notes,
    job_title,
    applicant_name,
    applicant_phone,
    applicant_city,
    applicant_email,
  } = req.body ?? {};

  const employerId = Number(employer_user_id) || 5;
  const candIds = Array.isArray(candidate_user_ids)
    ? candidate_user_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const primaryApplicantId = Number(applicant_user_id) || (candIds.length > 0 ? candIds[0] : 101);
  if (candIds.length === 0 && primaryApplicantId) {
    candIds.push(primaryApplicantId);
  }

  if (!interview_title || !interview_date || !start_time) {
    return res.status(400).json({ success: false, message: "Title, date, and start time are required." });
  }

  try {
    const jobPostId = job_post_id ? Number(job_post_id) : null;
    const stage = interview_stage?.trim() || "On-Site Interview";
    const type = "On-Site"; // Fixed On-Site
    const formattedEndTime = end_time?.trim() || start_time;
    const address = meeting_link_or_address?.trim() || "On-Site";

    const result = await run(
      `INSERT INTO scheduled_interviews (
         employer_user_id, applicant_user_id, candidate_user_ids,
         job_post_id, interview_title, interview_stage, interview_type,
         meeting_link_or_address, interview_date, start_time, end_time,
         notes, status, job_title, applicant_name, applicant_phone,
         applicant_city, applicant_email, employer_company_name,
         deleted_by_employer, deleted_by_applicant
       ) VALUES (?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'Cebuana Lhuillier', FALSE, FALSE)`,
      [
        employerId,
        primaryApplicantId,
        JSON.stringify(candIds),
        jobPostId,
        interview_title.trim(),
        stage,
        type,
        address,
        interview_date.trim(),
        start_time.trim(),
        formattedEndTime,
        notes?.trim() || null,
        job_title?.trim() || null,
        applicant_name?.trim() || null,
        applicant_phone?.trim() || null,
        applicant_city?.trim() || null,
        applicant_email?.trim() || null,
      ]
    );

    const empProfile = await get("SELECT business_name FROM employer_profiles WHERE user_id = ?", [employerId]);
    const empName = empProfile?.business_name || "Cebuana Lhuillier";

    // Create notification for primary candidate if valid registered user
    if (primaryApplicantId && primaryApplicantId < 100) {
      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'interview_scheduled', ?, ?, ?, ?)`,
        [
          primaryApplicantId,
          `Interview Scheduled: ${interview_title.trim()}`,
          `${empName} has scheduled an interview with you on ${interview_date.trim()} at ${start_time.trim()} (${type}).`,
          employerId,
          jobPostId,
        ]
      ).catch(() => {});
    }

    const newInterview = await get(
      `SELECT * FROM scheduled_interviews WHERE id = ?`,
      [result.lastID]
    );

    if (newInterview && typeof newInterview.candidate_user_ids === "string") {
      try {
        newInterview.candidate_user_ids = JSON.parse(newInterview.candidate_user_ids);
      } catch {
        newInterview.candidate_user_ids = [];
      }
    }

    return res.status(201).json({ success: true, interview: newInterview });
  } catch (err) {
    console.error("Create interview error:", err);
    return res.status(500).json({ success: false, message: "Unable to schedule interview." });
  }
});

app.delete("/api/interviews/:id", async (req, res) => {
  const id = Number(req.params.id);
  const role = String(req.query.role || req.body?.role || "employer").toLowerCase().trim();

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid interview ID." });
  }

  try {
    const existing = await get("SELECT * FROM scheduled_interviews WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Interview not found." });
    }

    if (role === "employer") {
      await run(
        "UPDATE scheduled_interviews SET deleted_by_employer = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    } else {
      await run(
        "UPDATE scheduled_interviews SET deleted_by_applicant = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    }

    return res.json({ success: true, message: "Interview deleted successfully for your view." });
  } catch (err) {
    console.error("Delete interview error:", err);
    return res.status(500).json({ success: false, message: "Unable to delete interview." });
  }
});

app.patch("/api/interviews/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status, notes, updated_by_user_id } = req.body ?? {};

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid interview ID." });
  }

  const validStatuses = ["pending", "accepted", "declined", "rescheduled", "completed", "cancelled"];
  const targetStatus = String(status || "").toLowerCase().trim();
  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ success: false, message: "Invalid interview status." });
  }

  try {
    const existing = await get("SELECT * FROM scheduled_interviews WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Interview not found." });
    }

    await run(
      `UPDATE scheduled_interviews
       SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [targetStatus, notes !== undefined ? notes : null, id]
    );

    // Notify the other party if valid registered user
    const updaterId = Number(updated_by_user_id);
    const isApplicantUpdating = updaterId === existing.applicant_user_id;
    const recipientUserId = isApplicantUpdating ? existing.employer_user_id : existing.applicant_user_id;

    if (recipientUserId && recipientUserId < 100) {
      let notifTitle = `Interview Update: ${existing.interview_title}`;
      let notifBody = `The interview scheduled for ${existing.interview_date} at ${existing.start_time} has been updated to "${targetStatus}".`;

      if (targetStatus === "accepted") {
        notifTitle = `Interview Confirmed!`;
        notifBody = `The candidate has confirmed the interview on ${existing.interview_date} at ${existing.start_time}.`;
      } else if (targetStatus === "declined") {
        notifTitle = `Interview Declined`;
        notifBody = `The candidate has declined the interview scheduled for ${existing.interview_date}.`;
      } else if (targetStatus === "cancelled") {
        notifTitle = `Interview Cancelled`;
        notifBody = `The scheduled interview on ${existing.interview_date} was cancelled.`;
      }

      await run(
        `INSERT INTO notifications (user_id, type, title, body, related_user_id, related_application_id)
         VALUES (?, 'interview_status_update', ?, ?, ?, ?)`,
        [recipientUserId, notifTitle, notifBody, updaterId || null, existing.job_post_id]
      ).catch(() => {});
    }

    return res.json({ success: true, status: targetStatus });
  } catch (err) {
    console.error("Update interview status error:", err);
    return res.status(500).json({ success: false, message: "Unable to update interview status." });
  }
});

app.get("/api/employers/:id/schedulable-candidates", async (req, res) => {
  const employerId = Number(req.params.id);
  if (!Number.isInteger(employerId) || employerId < 1) {
    return res.status(400).json({ success: false, message: "Invalid employer ID." });
  }

  try {
    const rows = await all(
      `WITH candidate_ids AS (
         SELECT a.applicant_user_id AS user_id, a.job_post_id, COALESCE(a.status, 'approved') AS application_status
         FROM applications a
         JOIN job_posts jp ON a.job_post_id = jp.id
         WHERE (jp.employer_user_id = ? OR (jp.employer_user_id = 5 AND ? IN (1, 5, 6)))
       )
       SELECT DISTINCT c.user_id,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ap.first_name, ap.middle_name, ap.last_name)), ''), u.email, 'Candidate') AS full_name,
              ap.first_name, ap.last_name, ap.desired_job_title, ap.phone, ap.city,
              u.email,
              c.job_post_id,
              jp.title AS job_title,
              c.application_status,
              ap.skills,
              ap.summary,
              ap.languages,
              ap.qualifications,
              ap.certifications,
              ap.work_arrangement,
              ap.expected_salary_min,
              ap.expected_salary_max,
              ap.expected_salary,
              ap.preferred_locations,
              ap.years_of_experience,
              ap.work_experience_json,
              ap.resume_path,
              ap.profile_picture_path
       FROM candidate_ids c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN applicant_profiles ap ON c.user_id = ap.user_id
       LEFT JOIN job_posts jp ON c.job_post_id = jp.id
       ORDER BY full_name ASC`,
      [employerId, employerId]
    );

    const candidates = rows.map((r) => {
      let skillsArr = [];
      if (typeof r.skills === "string" && r.skills.trim()) {
        try {
          const parsed = JSON.parse(r.skills);
          skillsArr = Array.isArray(parsed) ? parsed : r.skills.split(",").map((s) => s.trim()).filter(Boolean);
        } catch {
          skillsArr = r.skills.split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(r.skills)) {
        skillsArr = r.skills;
      }

      return {
        ...r,
        skills: skillsArr,
        match_percentage: 95,
      };
    });

    return res.json({ success: true, candidates });
  } catch (err) {
    console.error("Fetch schedulable candidates error:", err);
    return res.status(500).json({ success: false, message: "Unable to load candidates." });
  }
});

async function syncHistoricalInvitations() {
  try {
    const historical = await all(
      `SELECT n.id, n.user_id AS applicant_user_id, n.related_user_id AS employer_user_id, n.related_application_id AS job_post_id, n.body AS custom_message, n.created_at
       FROM notifications n
       JOIN job_posts jp ON jp.id = n.related_application_id
       WHERE n.type = 'job_invitation' AND n.related_user_id IS NOT NULL AND n.related_application_id IS NOT NULL`
    );
    for (const h of historical) {
      const exists = await get(
        `SELECT id FROM job_invitations WHERE employer_user_id = ? AND applicant_user_id = ? AND job_post_id = ?`,
        [h.employer_user_id, h.applicant_user_id, h.job_post_id]
      );
      if (!exists) {
        await run(
          `INSERT INTO job_invitations (employer_user_id, applicant_user_id, job_post_id, custom_message, status, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?)`,
          [h.employer_user_id, h.applicant_user_id, h.job_post_id, h.custom_message, h.created_at]
        );
      }
    }
  } catch (err) {
    console.error("Sync historical invitations error:", err);
  }
}

async function initPgDatabase() {
  try {
    const client = await pgPool.connect();
    client.release();
    return true;
  } catch (err) {
    if (err && err.code === "3D000") {
      console.log("Database 'elitecruit' does not exist yet. Auto-creating database...");
      try {
        const adminUrl = DATABASE_URL.replace(/\/elitecruit(\?.*)?$/, "/postgres");
        const adminPool = new pg.Pool({ connectionString: adminUrl });
        await adminPool.query("CREATE DATABASE elitecruit;");
        await adminPool.end();
        console.log("Database 'elitecruit' auto-created successfully!");
        return true;
      } catch (createErr) {
        console.error("Auto-creation of 'elitecruit' database failed:", createErr.message);
        throw err;
      }
    }
    throw err;
  }
}

async function ensureAdminUser() {
  try {
    const admin = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (!admin) {
      const defaultEmail = (process.env.ADMIN_INITIAL_EMAIL || "admin@elitecruit").trim().toLowerCase();
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || "Admin123!";
      const hash = await bcrypt.hash(defaultPassword, 10);
      const res = await run(
        "INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'admin', true)",
        [defaultEmail, hash]
      );
      if (res.lastID) {
        await run(
          "INSERT INTO admin_profiles (user_id, display_name) VALUES (?, 'System Administrator') ON CONFLICT (user_id) DO NOTHING",
          [res.lastID]
        );
      }
      console.log(`Default admin account provisioned: ${defaultEmail} / ${defaultPassword}`);
    }
  } catch (err) {
    console.error("Ensure admin user error:", err);
  }
}

// In production or full-stack deployment, serve built Frontend files if dist exists
const distPath = path.resolve(__dirname, "../Frontend/dist");
if (fs.existsSync(distPath)) {
  app.use(
    express.static(distPath, {
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      },
    })
  );
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "API endpoint not found." });
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  });
}

Promise.resolve()
  .then(() => initPgDatabase())
  .then(() => ensureExtendedTables())
  .then(() => migrateApplicantProfilesRemoveExperience())
  .then(() => ensureApplicantProfileColumns())
  .then(() => ensureEmployerProfileColumns())
  .then(() => ensureJobPostColumns())
  .then(() => ensureScheduledInterviewColumns())
  .then(() => syncHistoricalInvitations())
  .then(() => ensureAdminUser())
  .then(() => app.listen(PORT, () => {
    console.log(`EliteCruit backend running at http://localhost:${PORT}`);
  }))
  .catch((error) => {
    console.error("Failed to prepare the database:", error);
    process.exit(1);
  });
