PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Clear child tables first for idempotent re-seed.
DELETE FROM applicant_profiles;
DELETE FROM employer_profiles;
DELETE FROM users;

-- Reset autoincrement for deterministic IDs.
DELETE FROM sqlite_sequence WHERE name IN ('users');

INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at) VALUES
  (1, 'admin@elitecruit.local', 'CHANGE_ME_HASHED_PASSWORD', 'admin', 1, '2026-07-29 06:31:51', '2026-07-29 06:31:51'),
  (2, 'juan.applicant@test.local', '$2a$10$GQ4kS3BykiOwlPZQM26HAeWR.dRfByv9B3P7Drc1mIm7WicVfj4vm', 'applicant', 1, '2026-07-29 06:36:46', '2026-07-29 06:36:46'),
  (3, 'acme.employer@test.local', '$2a$10$zmyMHiP9pRZRU3Tng1JT9.XMsskm4dlbUQZr9U19Q6qP5HWs7cYKu', 'employer', 1, '2026-07-29 06:36:55', '2026-07-29 06:36:55'),
  (4, 'zaki_ablando897@yahoo.com', '$2a$10$lgT1ocaILCn.NV3ZiPwseenJzBBfv38beBJiNFm/vUScstDszB5eq', 'applicant', 1, '2026-07-29 07:03:48', '2026-07-29 07:03:48'),
  (5, 'zakiablando897@gmail.com', '$2a$10$0yhZ9NImcZYG.7iwq/78EOj/5yp.WKSmtBJ3ZVuFpaPF7A1PnByXC', 'employer', 1, '2026-07-30 14:39:30', '2026-07-30 14:39:30'),
  (6, 'gamingzones727@gmail.com', '$2a$10$n/YmdJRHEIJGd/jhxJ4PJ.Zmx2u5tOKJ15szN5.QapTEsMNoHcLEi', 'employer', 1, '2026-07-30 16:22:43', '2026-07-30 16:22:43');

INSERT INTO applicant_profiles (
  user_id,
  first_name,
  middle_name,
  last_name,
  terms_accepted,
  terms_accepted_at,
  phone,
  city,
  address,
  desired_job_title,
  expected_salary,
  work_arrangement,
  skills,
  experience,
  certifications,
  qualifications,
  resume_path
) VALUES
  (2, 'Juan', 'Santos', 'Dela Cruz', 1, '2026-07-29 06:36:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  (4, 'Zaki', NULL, 'Ablando', 1, '2026-07-29 07:03:48', NULL, NULL, NULL, NULL, NULL, NULL, 'cbvcbv', NULL, NULL, 'hghg', NULL);

INSERT INTO employer_profiles (
  user_id,
  business_name,
  terms_accepted,
  terms_accepted_at
) VALUES
  (3, 'Acme Hiring Inc', 1, '2026-07-29 06:36:55'),
  (5, 'CEBUANA', 1, '2026-07-30 14:39:30'),
  (6, 'CEBUANA', 1, '2026-07-30 16:22:43');

COMMIT;
PRAGMA foreign_keys = ON;
