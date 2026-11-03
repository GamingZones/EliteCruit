export interface LegalSection {
  title: string;
  content: string[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  subtitle: "EliteCruit Recruitment & ATS Platform",
  lastUpdated: "January 2026",
  sections: [
    {
      title: "1. Acceptance of Terms",
      content: [
        "Welcome to EliteCruit. By accessing, browsing, registering for, or using our web application and related services (collectively, the 'Platform'), you agree to comply with and be bound by these Terms of Service ('Terms').",
        "If you do not agree with any part of these Terms, you must immediately discontinue use of the Platform. These Terms apply to all registered users, including Job Applicants, Employers, Recruitment Representatives, and Platform Administrators.",
      ],
    },
    {
      title: "2. Eligibility & Account Registration",
      content: [
        "To create an account, you must be at least 18 years of age or possess legal capacity under the laws of the Republic of the Philippines to enter into binding agreements.",
        "You agree to provide accurate, current, and complete registration information during account creation and to maintain and promptly update such details. You are responsible for safeguarding your login credentials and two-factor authentication (2FA) OTP codes.",
        "EliteCruit reserves the right to suspend or terminate accounts that contain false, misleading, or fraudulent identity information.",
      ],
    },
    {
      title: "3. Job Applicant Obligations",
      content: [
        "Applicants agree that all information supplied within their candidate profile, including work history, educational attainment, skills, certifications, and expected salary parameters, represents an authentic and truthful summary of their qualifications.",
        "Applicants understand that submission of an application grants the prospective Employer authorization to review profile details, schedule interviews, and extend employment propositions within the scope of the applied vacancy.",
        "Misrepresenting identity, qualifications, or credentials may result in immediate profile disqualification and permanent platform suspension.",
      ],
    },
    {
      title: "4. Employer Obligations & Fair Hiring",
      content: [
        "Employers represent and warrant that all published job openings reflect genuine, active employment vacancies with accurate descriptions of duties, compensation ranges, and branch locations.",
        "Employers agree to utilize candidate personal data, contact numbers, and resumes strictly for lawful recruitment and evaluation purposes. Reselling, harvesting, or transferring candidate data to third parties without express written consent is strictly prohibited.",
        "Employers must adhere to all applicable labor and employment regulations of the Republic of the Philippines, ensuring non-discriminatory hiring practices regardless of gender, age, religious belief, marital status, or disability.",
      ],
    },
    {
      title: "5. Intelligent Matching & Automated Screening",
      content: [
        "EliteCruit provides intelligent algorithmic compatibility evaluation and municipal distance proximity matching (Cavite Municipal Matrix) to assist applicants and employers in identifying relevant opportunities.",
        "While our matching models strive for objective compatibility indexing, hiring decisions remain the sole prerogative and responsibility of the respective Employer. EliteCruit does not guarantee employment offers to applicants nor candidate acceptance to employers.",
      ],
    },
    {
      title: "6. Formal Offers & Direct Invitations",
      content: [
        "Employers may issue formal offer letters or direct candidate recruitment invitations through the Platform. Terms articulated within formal offer letters (including compensation, probationary intervals, and commencement dates) represent independent agreements between the Employer and the Applicant.",
        "EliteCruit acts as an enabling technology platform and is not a direct employer, labor contractor, or employment agency in connection with individual employment contracts.",
      ],
    },
    {
      title: "7. Prohibited Conduct",
      content: [
        "Users agree not to: (a) reverse engineer, decompile, or harvest source code or proprietary algorithms of the Platform; (b) deploy automated bots, spiders, or scrapers; (c) transmit fraudulent, harassing, defamatory, or unlawful materials; (d) circumvent authentication controls, permission barriers, or security verifications; or (e) post fraudulent fee-charging employment schemes.",
      ],
    },
    {
      title: "8. Limitation of Liability & Governing Law",
      content: [
        "To the maximum extent permitted by Philippine law, EliteCruit shall not be liable for indirect, incidental, punitive, or consequential damages resulting from platform downtime, candidate-employer disputes, or hiring decisions.",
        "These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts of Cavite, Philippines.",
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  subtitle: "Compliance with the Data Privacy Act of 2012 (RA 10173)",
  lastUpdated: "January 2026",
  sections: [
    {
      title: "1. Commitment to Data Privacy",
      content: [
        "EliteCruit ('we', 'us', or 'our') is committed to upholding the privacy rights of all users in compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (DPA) of the Philippines, its Implementing Rules and Regulations, and National Privacy Commission (NPC) issuances.",
        "This Privacy Policy articulates the categories of personal data we collect, the purposes of processing, storage procedures, sharing protocols, and the statutory rights available to you as a Data Subject.",
      ],
    },
    {
      title: "2. Personal Data We Collect",
      content: [
        "We collect personal data that you voluntarily provide or that is automatically generated through platform engagement:",
        "• Applicant Identity Data: Full legal name, email address, mobile phone number, province, municipality/city, profile photo, and biography.",
        "• Professional & Career Data: Work history, job titles, educational qualifications, technical competencies, desired roles, work arrangement preferences, and salary expectations.",
        "• Employer Information: Registered business name, business email, primary contact number, corporate headquarters, and branch office addresses.",
        "• Security & Verification Telemetry: Passwords (cryptographically hashed), one-time passwords (OTP), session tokens, IP addresses, and audit access logs.",
      ],
    },
    {
      title: "3. Purpose of Data Processing",
      content: [
        "Your personal data is processed solely for legitimate recruitment and platform operations, including:",
        "• Generating your verified candidate or employer profile for platform visibility.",
        "• Evaluating candidate-to-vacancy compatibility and municipal distance proximity.",
        "• Transmitting critical security alerts, two-factor authentication verification codes, and interview schedule notices.",
        "• Facilitating formal offer letters, direct invitations, and applicant milestone updates.",
        "• Enforcing system security, preventing identity theft, and preserving recruitment integrity.",
      ],
    },
    {
      title: "4. Data Sharing & Disclosure Principles",
      content: [
        "Candidate profile details and work experiences are disclosed to Employers only when the applicant submits an application or participates in the searchable talent discovery pool.",
        "We do not sell, rent, or trade your personal data to marketing brokers or unrelated third parties. Data transfers to third-party technical vendors (e.g., transactional email infrastructure, database hosting) occur under strict confidentiality and security agreements.",
        "We may disclose information where required by Philippine law, judicial subpoenas, or valid regulatory directives from law enforcement or labor agencies.",
      ],
    },
    {
      title: "5. Data Security & Storage Architecture",
      content: [
        "We implement organizational, physical, and technical safeguards designed to protect personal data against accidental loss, unauthorized access, alteration, or disclosure.",
        "All data transmissions are encrypted using Transport Layer Security (TLS/HTTPS). Authentication tokens utilize JSON Web Tokens (JWT) with restricted lifetimes, and database storage operates within secure regional cloud servers adhering to industry compliance standards.",
      ],
    },
    {
      title: "6. Data Subject Rights under RA 10173",
      content: [
        "As a recognized Data Subject under the Philippine Data Privacy Act, you are entitled to:",
        "• Right to be Informed: Know how your data is collected, processed, and shared.",
        "• Right to Access: Obtain copies of personal data stored in your account.",
        "• Right to Rectification: Correct inaccurate or outdated details at any time via your profile settings.",
        "• Right to Erasure / Blocking: Request the suspension, withdrawal, or deletion of your personal data upon closing your account.",
        "• Right to File a Complaint: Lodge complaints with the National Privacy Commission if your privacy rights have been infringed.",
      ],
    },
    {
      title: "7. Contact Our Data Protection Team",
      content: [
        "For questions regarding this Privacy Policy, exercising your statutory data subject rights, or reporting privacy concerns, please contact our designated Data Protection Officer (DPO) at privacy@elitecruit.com or support@elitecruit.com.",
      ],
    },
  ],
};
