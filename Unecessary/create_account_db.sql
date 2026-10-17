PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Base users table shared by all account types.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('applicant', 'employer', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Applicant-only details from the create-account form.
CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  address TEXT,
  desired_job_title TEXT,
  expected_salary TEXT,
  work_arrangement TEXT,
  skills TEXT,
  experience TEXT,
  certifications TEXT,
  qualifications TEXT,
  resume_path TEXT,
  terms_accepted INTEGER NOT NULL DEFAULT 0 CHECK (terms_accepted IN (0, 1)),
  terms_accepted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Employer-only details from the create-account form.
CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id INTEGER PRIMARY KEY,
  business_name TEXT NOT NULL,
  terms_accepted INTEGER NOT NULL DEFAULT 0 CHECK (terms_accepted IN (0, 1)),
  terms_accepted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional admin details.
CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Keep updated_at in sync whenever the users row is modified.
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

-- Enforce that only applicant users can be inserted into applicant_profiles.
CREATE TRIGGER IF NOT EXISTS trg_applicant_role_guard
BEFORE INSERT ON applicant_profiles
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (SELECT role FROM users WHERE id = NEW.user_id) != 'applicant'
      THEN RAISE(ABORT, 'Only users with applicant role can have applicant_profiles')
    END;
END;

-- Enforce that only employer users can be inserted into employer_profiles.
CREATE TRIGGER IF NOT EXISTS trg_employer_role_guard
BEFORE INSERT ON employer_profiles
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (SELECT role FROM users WHERE id = NEW.user_id) != 'employer'
      THEN RAISE(ABORT, 'Only users with employer role can have employer_profiles')
    END;
END;

-- Enforce that only admin users can be inserted into admin_profiles.
CREATE TRIGGER IF NOT EXISTS trg_admin_role_guard
BEFORE INSERT ON admin_profiles
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (SELECT role FROM users WHERE id = NEW.user_id) != 'admin'
      THEN RAISE(ABORT, 'Only users with admin role can have admin_profiles')
    END;
END;

-- Seed default admin account.
-- Password is intentionally a bootstrap value and must be rotated after first login.
INSERT OR IGNORE INTO users (id, email, password_hash, role, is_active)
VALUES (
  1,
  'admin@elitecruit.local',
  'CHANGE_ME_HASHED_PASSWORD',
  'admin',
  1
);

INSERT OR IGNORE INTO admin_profiles (user_id, display_name)
VALUES (1, 'System Administrator');

COMMIT;
