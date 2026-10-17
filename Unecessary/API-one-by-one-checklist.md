# EliteCruit One-by-One Data Flow Checklist

Base URL: http://localhost:5400

## 1) Applicant Profile (send/receive)

### GET
- GET /api/applicants/:userId/profile

### UPDATE
- PUT /api/applicants/:userId/profile
- Body:
```json
{
  "email": "juan.applicant@test.local",
  "first_name": "Juan",
  "middle_name": "Santos",
  "last_name": "Dela Cruz",
  "phone": "09171234567",
  "city": "Dasmarinas",
  "address": "Cavite",
  "desired_job_title": "Software Developer",
  "expected_salary": "35000",
  "work_arrangement": "Flexible"
}
```

### UPDATE SKILLS/CERTIFICATIONS/QUALIFICATIONS
- PUT /api/applicants/:userId/skills
```json
{ "skills": ["Java", "SQL"] }
```
- PUT /api/applicants/:userId/tags
```json
{ "field": "certifications", "items": ["Oracle Java Foundations"] }
```

## 2) Employer Profile (send/receive)

### GET
- GET /api/employers/:userId/profile

### UPDATE
- PUT /api/employers/:userId/profile
```json
{
  "business_name": "CEBUANA",
  "industry": "Information Technology",
  "company_description": "Tech company profile",
  "contact_number": "09123456789",
  "company_address": "Dasmarinas, Cavite",
  "website": "https://example.com",
  "company_logo_path": "/uploads/company/logo.png",
  "company_cover_path": "/uploads/company/cover.png"
}
```

## 3) Job Posts (send/receive)

### CREATE
- POST /api/employers/:userId/job-posts
```json
{
  "title": "Software Developer",
  "location": "Cavite",
  "status": "open",
  "work_arrangement": "Flexible",
  "salary_min": 25000,
  "salary_max": 35000,
  "description": "Role description",
  "qualifications": "Bachelor's Degree",
  "responsibilities": "Develop and maintain",
  "required_skills": "Java, SQL"
}
```

### LIST
- GET /api/employers/:userId/job-posts

## 4) Company FAQ (send/receive)

### CREATE
- POST /api/employers/:userId/faqs
```json
{
  "question": "Do you accept fresh graduates?",
  "answer": "Yes",
  "question_type": "Requirements",
  "is_active": true
}
```

Allowed question_type values:
- Requirements
- Application Process
- Salary and Work Arrangement
- Company Information
- Documents
- Other

### LIST
- GET /api/employers/:userId/faqs

## 5) Messages (send/receive)

### CREATE THREAD + FIRST MESSAGE
- POST /api/messages/threads
```json
{
  "created_by_user_id": 6,
  "participant_user_ids": [2],
  "title": "Application Follow-up",
  "message_text": "Thank you for your application."
}
```

### SEND MESSAGE TO THREAD
- POST /api/messages/threads/:threadId/messages
```json
{
  "sender_user_id": 2,
  "message_text": "Thank you!"
}
```

### LIST USER THREADS
- GET /api/users/:userId/messages

## 6) Notifications (send/receive)

### CREATE
- POST /api/notifications
```json
{
  "user_id": 2,
  "type": "new_message",
  "title": "New Message",
  "body": "You have a new message",
  "related_user_id": 6
}
```

### LIST
- GET /api/users/:userId/notifications

### MARK READ
- PUT /api/notifications/:id/read

## Notes
- Work arrangement supports: Hybrid, On-Site, Remote, Flexible.
- Endpoints are prepared for incremental testing of each data module.
