PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- This seed assumes the schema from Database/elitecruit-schema.sql is already applied.
-- It links all demo data to your current real users:
-- admin: id=1
-- applicants: id=2, id=4
-- employers: id=3, id=5, id=6

-- -------------------------
-- Clear extended-domain tables first
-- -------------------------
DELETE FROM sessions;
DELETE FROM admin_audit_logs;
DELETE FROM admin_profiles;
DELETE FROM notification_settings;
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM message_participants;
DELETE FROM message_threads;
DELETE FROM shortlisted_candidates;
DELETE FROM screening_stage_assignments;
DELETE FROM screening_pipelines;
DELETE FROM applications;
DELETE FROM job_posts;
DELETE FROM company_faq;
DELETE FROM applicant_documents;

-- Reset autoincrement counters for deterministic IDs.
DELETE FROM sqlite_sequence
WHERE name IN (
  'sessions',
  'admin_audit_logs',
  'notifications',
  'messages',
  'message_threads',
  'shortlisted_candidates',
  'screening_stage_assignments',
  'screening_pipelines',
  'applications',
  'job_posts',
  'company_faq',
  'applicant_documents'
);

-- -------------------------
-- Admin domain
-- -------------------------
INSERT INTO admin_profiles (user_id, display_name, permissions_json, created_at, updated_at)
VALUES
  (1, 'EliteCruit Admin', '["manage_users","manage_roles","moderate_content","audit_logs","manage_system_settings"]', '2026-07-29 06:32:30', '2026-07-31 08:10:00');

INSERT INTO admin_audit_logs (id, admin_user_id, action, target_user_id, metadata_json, created_at)
VALUES
  (1, 1, 'activate_user', 2, '{"from":"inactive","to":"active"}', '2026-07-31 08:15:00'),
  (2, 1, 'role_review', 6, '{"note":"Employer account verified"}', '2026-07-31 08:20:00');

-- -------------------------
-- Applicant documents
-- -------------------------
INSERT INTO applicant_documents (id, user_id, doc_type, file_name, file_url, mime_type, size_bytes, uploaded_at)
VALUES
  (1, 2, 'resume', 'juan-delacruz-resume.pdf', '/uploads/resumes/juan-delacruz-resume.pdf', 'application/pdf', 254321, '2026-07-30 09:00:00'),
  (2, 4, 'resume', 'zaki-ablando-resume.pdf', '/uploads/resumes/zaki-ablando-resume.pdf', 'application/pdf', 193842, '2026-07-30 09:20:00'),
  (3, 4, 'certificate', 'zaki-java-certificate.pdf', '/uploads/certificates/zaki-java-certificate.pdf', 'application/pdf', 142210, '2026-07-30 09:25:00');

-- -------------------------
-- Employer job posts
-- -------------------------
INSERT INTO job_posts (
  id,
  employer_user_id,
  title,
  location,
  status,
  work_arrangement,
  salary_min,
  salary_max,
  description,
  qualifications,
  responsibilities,
  required_skills,
  published_at,
  created_at,
  updated_at
) VALUES
  (
    1,
    6,
    'Software Developer',
    'Dasmarinas, Cavite',
    'open',
    'Hybrid',
    25000,
    35000,
    'Develop and maintain web applications across internal hiring platforms.',
    'Bachelor''s Degree, 2+ Years Experience, Relevant Certifications',
    'Develop web applications, Collaborate with teams, Maintain documentation',
    'Java, SQL, Problem-solving',
    '2026-07-30 10:00:00',
    '2026-07-30 09:50:00',
    '2026-07-31 09:10:00'
  ),
  (
    2,
    6,
    'HR Manager',
    'Bacoor, Cavite',
    'open',
    'On-Site',
    40000,
    55000,
    'Lead recruitment operations and employee relations workflows.',
    'Bachelor''s Degree, 4+ Years HR Experience',
    'Manage hiring operations, Coordinate interviews, Lead policy compliance',
    'Recruitment, Employee Relations, Leadership',
    '2026-07-30 10:30:00',
    '2026-07-30 10:15:00',
    '2026-07-31 09:12:00'
  ),
  (
    3,
    5,
    'Frontend Developer',
    'Imus, Cavite',
    'open',
    'Remote',
    35000,
    50000,
    'Build responsive interfaces for candidate and employer dashboards.',
    'Bachelor''s Degree, 2+ Years Frontend Experience',
    'Implement UI components, Coordinate with backend, Improve UX quality',
    'React, TypeScript, CSS',
    '2026-07-30 11:00:00',
    '2026-07-30 10:45:00',
    '2026-07-31 09:14:00'
  );

-- -------------------------
-- Applications and screening
-- -------------------------
INSERT INTO applications (
  id,
  job_post_id,
  applicant_user_id,
  status,
  match_score,
  stage,
  cover_letter,
  submitted_at,
  updated_at
) VALUES
  (1, 1, 2, 'reviewed', 67, 'under_review', 'I am interested in this role and have relevant Java experience.', '2026-07-30 12:00:00', '2026-07-31 08:30:00'),
  (2, 1, 4, 'shortlisted', 79, 'shortlisted', 'I have handled frontend and backend support tasks in prior projects.', '2026-07-30 12:10:00', '2026-07-31 08:40:00'),
  (3, 2, 2, 'pending', 90, 'new_applicants', 'I can contribute to hiring process optimization and coordination.', '2026-07-30 12:20:00', '2026-07-31 08:50:00');

INSERT INTO screening_pipelines (id, job_post_id, name, created_at, updated_at)
VALUES
  (1, 1, 'Default Screening Pipeline - Software Developer', '2026-07-30 12:30:00', '2026-07-31 09:00:00'),
  (2, 2, 'Default Screening Pipeline - HR Manager', '2026-07-30 12:31:00', '2026-07-31 09:01:00');

INSERT INTO screening_stage_assignments (id, pipeline_id, application_id, stage, moved_by_user_id, moved_at)
VALUES
  (1, 1, 1, 'under_review', 6, '2026-07-31 08:30:00'),
  (2, 1, 2, 'shortlisted', 6, '2026-07-31 08:40:00'),
  (3, 2, 3, 'new_applicants', 6, '2026-07-31 08:50:00');

INSERT INTO shortlisted_candidates (id, application_id, shortlisted_by_user_id, created_at)
VALUES
  (1, 2, 6, '2026-07-31 08:40:00');

-- -------------------------
-- Company FAQ
-- -------------------------
INSERT INTO company_faq (id, employer_user_id, category, question, answer, is_active, created_at, updated_at)
VALUES
  (1, 6, 'Requirements', 'Do you accept fresh graduates?', 'Yes. Fresh graduates may apply for junior roles when they can show relevant projects, internships, or certifications.', 1, '2026-07-31 09:20:00', '2026-07-31 09:20:00'),
  (2, 6, 'Documents', 'What applicant documents should I prepare?', 'Please keep your resume, portfolio link, and role-related certificates ready in Applicant Documents.', 1, '2026-07-31 09:22:00', '2026-07-31 09:22:00'),
  (3, 5, 'Application Process', 'How long does initial screening take?', 'Initial screening usually takes 3 to 5 business days depending on role volume.', 1, '2026-07-31 09:24:00', '2026-07-31 09:24:00');

-- -------------------------
-- Messaging
-- -------------------------
INSERT INTO message_threads (id, subject, created_by_user_id, created_at, updated_at)
VALUES
  (1, 'Software Developer Application Update', 6, '2026-07-31 09:30:00', '2026-07-31 10:30:00'),
  (2, 'Frontend Developer Application Update', 5, '2026-07-31 09:35:00', '2026-07-31 10:10:00'),
  (3, 'General Recruitment Inquiry', 6, '2026-07-31 09:40:00', '2026-07-31 09:55:00');

INSERT INTO messages (id, thread_id, sender_user_id, body, is_system, created_at)
VALUES
  (1, 1, 6, 'Thank you for your application. Your profile is moving to the next review step.', 0, '2026-07-31 10:30:00'),
  (2, 2, 5, 'Your application is currently under review by our team.', 0, '2026-07-31 10:10:00'),
  (3, 3, 6, 'Your application update is ready. Please check your dashboard.', 0, '2026-07-31 09:55:00');

INSERT INTO message_participants (thread_id, user_id, last_read_message_id, joined_at)
VALUES
  (1, 6, 1, '2026-07-31 09:30:00'),
  (1, 2, NULL, '2026-07-31 09:31:00'),
  (2, 5, 2, '2026-07-31 09:35:00'),
  (2, 4, NULL, '2026-07-31 09:36:00'),
  (3, 6, 3, '2026-07-31 09:40:00'),
  (3, 2, 3, '2026-07-31 09:41:00');

-- -------------------------
-- Notifications + settings
-- -------------------------
INSERT INTO notifications (id, user_id, type, title, body, payload_json, is_read, created_at, read_at)
VALUES
  (1, 2, 'application_reviewed', 'Application Reviewed', 'Your application for Software Developer has been reviewed', '{"applicationId":1,"jobPostId":1}', 0, '2026-07-31 09:00:00', NULL),
  (2, 2, 'new_message', 'New Message', 'You have a new message from CEBUANA.', '{"threadId":1}', 0, '2026-07-31 10:30:00', NULL),
  (3, 2, 'application_submitted', 'Application Submitted', 'Your application for Frontend Developer was successfully submitted', '{"applicationId":1}', 1, '2026-07-31 08:45:00', '2026-07-31 09:10:00'),
  (4, 4, 'new_message', 'New Message', 'You have a new message from CEBUANA.', '{"threadId":2}', 0, '2026-07-31 10:10:00', NULL),
  (5, 6, 'new_application', 'New Application', 'Juan applied for Software Developer.', '{"applicationId":1,"jobPostId":1}', 0, '2026-07-31 08:31:00', NULL),
  (6, 5, 'new_application', 'New Application', 'Zaki applied for Frontend Developer.', '{"applicationId":2,"jobPostId":3}', 0, '2026-07-31 08:41:00', NULL);

INSERT INTO notification_settings (user_id, email_notifications, application_updates, new_job_matches, messages, updated_at)
VALUES
  (2, 1, 1, 1, 1, '2026-07-31 10:35:00'),
  (4, 1, 1, 1, 1, '2026-07-31 10:35:00'),
  (5, 1, 1, 1, 1, '2026-07-31 10:35:00'),
  (6, 1, 1, 1, 1, '2026-07-31 10:35:00');

-- -------------------------
-- Sessions (demo)
-- -------------------------
INSERT INTO sessions (id, user_id, token_hash, remember_me, expires_at, created_at, revoked_at)
VALUES
  (1, 2, 'demo_token_hash_user_2', 1, '2026-08-30 10:00:00', '2026-07-31 10:00:00', NULL),
  (2, 6, 'demo_token_hash_user_6', 1, '2026-08-30 10:05:00', '2026-07-31 10:05:00', NULL);

COMMIT;
PRAGMA foreign_keys = ON;
