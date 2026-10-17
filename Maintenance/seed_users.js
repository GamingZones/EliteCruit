import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../Backend/.env"), override: true });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const DATABASE_URL = (process.env.DATABASE_URL || "postgresql://postgres:Zakijames5086@localhost:5432/elitecruit").trim();
const pool = new pg.Pool({ connectionString: DATABASE_URL });

const applicantsData = [
  {
    email: "maria.santos@applicant.elitecruit.ph",
    password: "Applicant#Maria2026",
    firstName: "Maria Clarissa",
    middleName: "Dela Cruz",
    lastName: "Santos",
    phone: "+63 917 112 3401",
    city: "Dasmariñas",
    province: "Cavite",
    address: "Blk 14 Lot 8, Area C, Dasmariñas, Cavite",
    desiredJobTitle: "Senior Frontend Developer",
    expectedSalaryMin: 45000,
    expectedSalaryMax: 60000,
    workArrangement: "Hybrid",
    skills: "React, TypeScript, Tailwind CSS, REST APIs, Git, Next.js",
    qualifications: "BS Computer Science, De La Salle University - Dasmariñas (2022)",
    certifications: "Meta Certified Frontend Developer, AWS Cloud Practitioner",
    summary: "Dedicated frontend developer with 3+ years building responsive SPAs and design systems.",
    languages: "English, Filipino",
    shsStrand: "TVL-ICT",
    shsSchool: "Dasmariñas Integrated High School",
    shsGradYear: "2018",
    collegeGradYear: "2022",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.3294,
    longitude: 120.9367,
  },
  {
    email: "juan.reyes@applicant.elitecruit.ph",
    password: "Applicant#Juan2026",
    firstName: "Juan Carlos",
    middleName: "Bautista",
    lastName: "Reyes",
    phone: "+63 920 223 4512",
    city: "Imus",
    province: "Cavite",
    address: "145 Nueno Avenue, Tanzang Luma, Imus, Cavite",
    desiredJobTitle: "Industrial Maintenance Electrician",
    expectedSalaryMin: 22000,
    expectedSalaryMax: 28000,
    workArrangement: "On-Site",
    skills: "Electrical Wiring, PLC Troubleshooting, Preventive Maintenance, Motor Control, 3-Phase Systems",
    qualifications: "Vocational Diploma in Electrical Technology (2021)",
    certifications: "TESDA Electrical Installation & Maintenance NC II, DOLE BOSH Safety Officer",
    summary: "Licensed electrical technician with hands-on experience maintaining manufacturing and assembly plant machinery.",
    languages: "Filipino, English",
    shsStrand: "TVL-Industrial Arts",
    shsSchool: "Imus National High School",
    shsGradYear: "2019",
    collegeGradYear: null,
    vocationalGradYear: "2021",
    isNonGradCert: 1,
    latitude: 14.4296,
    longitude: 120.9367,
  },
  {
    email: "alyssa.mendoza@applicant.elitecruit.ph",
    password: "Applicant#Alyssa2026",
    firstName: "Alyssa Mae",
    middleName: "Fernandez",
    lastName: "Mendoza",
    phone: "+63 918 334 5623",
    city: "Bacoor",
    province: "Cavite",
    address: "Phase 2, Greenvalley, Molino II, Bacoor, Cavite",
    desiredJobTitle: "Customer Success Specialist",
    expectedSalaryMin: 28000,
    expectedSalaryMax: 35000,
    workArrangement: "Remote",
    skills: "Customer Service, Zendesk, Salesforce, CRM Management, Conflict Resolution, Technical Support",
    qualifications: "BS Business Administration - Marketing, Cavite State University - Bacoor (2023)",
    certifications: "HubSpot Inbound Customer Service Certification",
    summary: "Empathic and articulate customer support advocate experienced in multi-channel ticketing and client onboarding.",
    languages: "English, Filipino",
    shsStrand: "ABM",
    shsSchool: "Bacoor National High School",
    shsGradYear: "2019",
    collegeGradYear: "2023",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.4608,
    longitude: 120.9631,
  },
  {
    email: "mark.delatorre@applicant.elitecruit.ph",
    password: "Applicant#Mark2026",
    firstName: "Mark Anthony",
    middleName: "Gonzales",
    lastName: "Dela Torre",
    phone: "+63 927 445 6734",
    city: "General Trias",
    province: "Cavite",
    address: "Blk 8 Lot 19, Eagle Ridge Subd., General Trias, Cavite",
    desiredJobTitle: "Quality Assurance Engineer",
    expectedSalaryMin: 38000,
    expectedSalaryMax: 48000,
    workArrangement: "On-Site",
    skills: "ISO 9001:2015, Six Sigma, Quality Auditing, Root Cause Analysis, SPC, Metrology",
    qualifications: "BS Industrial Engineering, Lyceum of the Philippines University - Cavite (2021)",
    certifications: "Lean Six Sigma Green Belt, Certified Quality Inspector",
    summary: "Analytical QA engineer specializing in manufacturing line compliance, defect reduction, and statistical process control.",
    languages: "English, Filipino",
    shsStrand: "STEM",
    shsSchool: "Governor Ferrer Memorial National High School",
    shsGradYear: "2017",
    collegeGradYear: "2021",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.3854,
    longitude: 120.8814,
  },
  {
    email: "kristine.lim@applicant.elitecruit.ph",
    password: "Applicant#Kristine2026",
    firstName: "Kristine Joy",
    middleName: "Tan",
    lastName: "Lim",
    phone: "+63 908 556 7845",
    city: "Tagaytay",
    province: "Cavite",
    address: "72 Mahogany Road, Kaybagal South, Tagaytay City, Cavite",
    desiredJobTitle: "Hospitality & Guest Relations Manager",
    expectedSalaryMin: 32000,
    expectedSalaryMax: 42000,
    workArrangement: "On-Site",
    skills: "Hotel Front Desk Operations, Opera PMS, Guest Concierge, Event Planning, VIP Hospitality, Staff Supervision",
    qualifications: "BS Hospitality Management, Fora International Institute (2020)",
    certifications: "ServSafe Food & Beverage Manager, TESDA Front Office Services NC II",
    summary: "Hospitality professional with 4 years luxury resort front-office management experience in Metro Tagaytay.",
    languages: "English, Filipino, Mandarin",
    shsStrand: "TVL-Home Economics",
    shsSchool: "Tagaytay City National High School",
    shsGradYear: "2016",
    collegeGradYear: "2020",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.1153,
    longitude: 120.9621,
  },
  {
    email: "angelo.castro@applicant.elitecruit.ph",
    password: "Applicant#Angelo2026",
    firstName: "Angelo Rafael",
    middleName: "Mercado",
    lastName: "Castro",
    phone: "+63 919 667 8956",
    city: "Silang",
    province: "Cavite",
    address: "Km 46 Aguinaldo Highway, Lalaan 1st, Silang, Cavite",
    desiredJobTitle: "Junior Financial Analyst",
    expectedSalaryMin: 30000,
    expectedSalaryMax: 40000,
    workArrangement: "Hybrid",
    skills: "Financial Modeling, Advanced Excel, Quickbooks, Financial Reporting, Data Analysis, Budget Forecasting",
    qualifications: "BS Accountancy, Adventist University of the Philippines (2023)",
    certifications: "Certified Bookkeeper (MICB), Bloomberg Market Concepts (BMC)",
    summary: "Detail-driven accounting graduate with strong quantitative modeling and financial statement reconciliation skills.",
    languages: "English, Filipino",
    shsStrand: "ABM",
    shsSchool: "Silang National High School",
    shsGradYear: "2019",
    collegeGradYear: "2023",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.2312,
    longitude: 120.9744,
  },
  {
    email: "patricia.aquino@applicant.elitecruit.ph",
    password: "Applicant#Patricia2026",
    firstName: "Patricia Louise",
    middleName: "Navarro",
    lastName: "Aquino",
    phone: "+63 921 778 9067",
    city: "Trece Martires",
    province: "Cavite",
    address: "Blk 22 Lot 5, Hugo Perez, Trece Martires City, Cavite",
    desiredJobTitle: "Human Resources Generalist",
    expectedSalaryMin: 26000,
    expectedSalaryMax: 34000,
    workArrangement: "On-Site",
    skills: "Employee Onboarding, Talent Acquisition, Labor Law Compliance, Payroll Processing, DOLE Reporting, HRIS",
    qualifications: "BS Psychology, Cavite State University - Main Campus (2022)",
    certifications: "CHRP (Certified Human Resource Professional), DOLE Basic Labor Standards",
    summary: "Dynamic HR practitioner experienced in end-to-end recruitment pipelines, personnel records, and employee relations.",
    languages: "English, Filipino",
    shsStrand: "HUMSS",
    shsSchool: "Trece Martires City National High School",
    shsGradYear: "2018",
    collegeGradYear: "2022",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.2816,
    longitude: 120.8682,
  },
  {
    email: "dexter.villanueva@applicant.elitecruit.ph",
    password: "Applicant#Dexter2026",
    firstName: "Dexter",
    middleName: "Ramos",
    lastName: "Villanueva",
    phone: "+63 916 889 0178",
    city: "Rosario",
    province: "Cavite",
    address: "CEPZ Access Road, Tejeros Convention, Rosario, Cavite",
    desiredJobTitle: "Warehouse & Logistics Coordinator",
    expectedSalaryMin: 24000,
    expectedSalaryMax: 30000,
    workArrangement: "On-Site",
    skills: "Warehouse Management Systems (WMS), Inventory Auditing, Supply Chain Logistics, Forklift Safety, Dispatch Planning",
    qualifications: "Associate in Logistics Management, Cavite State University - Rosario Campus (2022)",
    certifications: "TESDA Heavy Equipment Operator (Forklift) NC II, Supply Chain Management Fundamentals",
    summary: "Systematic logistics coordinator skilled in fast-paced export zone inventory tracking, shipping manifests, and storage optimization.",
    languages: "Filipino, English",
    shsStrand: "TVL-Industrial Arts",
    shsSchool: "Rosario National High School",
    shsGradYear: "2020",
    collegeGradYear: "2022",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.4147,
    longitude: 120.8569,
  },
  {
    email: "beatrice.soriano@applicant.elitecruit.ph",
    password: "Applicant#Beatrice2026",
    firstName: "Beatrice Elena",
    middleName: "Corpuz",
    lastName: "Soriano",
    phone: "+63 929 990 1289",
    city: "Kawit",
    province: "Cavite",
    address: "88 Centennial Road, Binakayan, Kawit, Cavite",
    desiredJobTitle: "Digital Content & Marketing Specialist",
    expectedSalaryMin: 32000,
    expectedSalaryMax: 42000,
    workArrangement: "Flexible",
    skills: "Content Strategy, SEO Copywriting, Social Media Marketing, Meta Ads Manager, Google Analytics, Canva, Premiere Pro",
    qualifications: "BA Communication, San Sebastian College - Recoletos de Cavite (2023)",
    certifications: "Google Digital Marketing & E-commerce Professional Certificate, HubSpot Inbound Marketing",
    summary: "Creative storyteller and social strategist adept at high-converting brand campaigns and multi-channel engagement.",
    languages: "English, Filipino",
    shsStrand: "HUMSS",
    shsSchool: "Emiliano Tria Tirona Memorial National High School",
    shsGradYear: "2019",
    collegeGradYear: "2023",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.4447,
    longitude: 120.9025,
  },
  {
    email: "ronald.macaraeg@applicant.elitecruit.ph",
    password: "Applicant#Ronald2026",
    firstName: "Ronald Christian",
    middleName: "Pineda",
    lastName: "Macaraeg",
    phone: "+63 915 001 2390",
    city: "Carmona",
    province: "Cavite",
    address: "Paseo de Carmona, Maduya, Carmona, Cavite",
    desiredJobTitle: "Mechanical Maintenance Technician",
    expectedSalaryMin: 25000,
    expectedSalaryMax: 32000,
    workArrangement: "On-Site",
    skills: "Hydraulic Systems, Pneumatics, Mechanical Troubleshooting, HVAC Maintenance, Blueprint Reading, Safety Compliance",
    qualifications: "Diploma in Mechanical Engineering Technology, Technological University of the Philippines - Cavite (2021)",
    certifications: "TESDA RAC Servicing NC II, OSH Basic Occupational Safety and Health",
    summary: "Safety-conscious mechanical technician experienced in troubleshooting heavy manufacturing equipment and HVAC chiller plants.",
    languages: "Filipino, English",
    shsStrand: "TVL-Industrial Arts",
    shsSchool: "Carmona National High School",
    shsGradYear: "2018",
    collegeGradYear: "2021",
    vocationalGradYear: null,
    isNonGradCert: 0,
    latitude: 14.3142,
    longitude: 121.0544,
  },
];

const employersData = [
  {
    email: "careers@cavite-semicon.com.ph",
    password: "Employer#Semicon2026",
    businessName: "Cavite Precision Semiconductor Corp.",
    industry: "Semiconductor & Electronics",
    companySize: "501-1000",
    contactNumber: "+63 46 416 8800",
    city: "Rosario",
    province: "Cavite",
    companyAddress: "Cavite Economic Zone (CEZ), PEZA, Rosario, Cavite",
    companyDescription: "Leading manufacturer of microchip modules and high-precision semiconductor assembly components serving global electronics brands.",
    branches: [
      { name: "Main Factory Hub", address: "Block 5, Cavite Economic Zone, Rosario, Cavite" },
      { name: "Packaging Logistics Facility", address: "PEZA Compound, Rosario, Cavite" }
    ],
    latitude: 14.4147,
    longitude: 120.8569,
  },
  {
    email: "hr@tagaytayhighlandsresort.ph",
    password: "Employer#Highlands2026",
    businessName: "Tagaytay Summit Vista Resorts & Spa",
    industry: "Hospitality & Tourism",
    companySize: "201-500",
    contactNumber: "+63 46 483 1200",
    city: "Tagaytay",
    province: "Cavite",
    companyAddress: "Calamba Road, Kaybagal South, Tagaytay City, Cavite",
    companyDescription: "Premier mountain leisure destination offering world-class guest accommodations, gourmet restaurants, and wellness retreat facilities.",
    branches: [
      { name: "Main Clubhouse & Hotel", address: "Calamba Road, Kaybagal South, Tagaytay City" },
      { name: "Lakeside Events Pavilion", address: "Ligaya Drive, Tagaytay City" }
    ],
    latitude: 14.1153,
    longitude: 120.9621,
  },
  {
    email: "talent@southpeak-tech.io",
    password: "Employer#SouthPeak2026",
    businessName: "SouthPeak Innovations Software Labs",
    industry: "Information Technology",
    companySize: "51-200",
    contactNumber: "+63 46 884 9210",
    city: "Dasmariñas",
    province: "Cavite",
    companyAddress: "Cyberzone Park, Governor's Drive, Dasmariñas, Cavite",
    companyDescription: "Fast-scaling cloud software engineering firm specializing in bespoke SaaS development, modern web applications, and enterprise API architecture.",
    branches: [
      { name: "Dasmariñas Tech Hub", address: "Cyberzone Park, Governor's Drive, Dasmariñas, Cavite" }
    ],
    latitude: 14.3294,
    longitude: 120.9367,
  },
  {
    email: "recruitment@metro-cavite-logistics.com",
    password: "Employer#MetroLogistics2026",
    businessName: "Metro Cavite Express Freight & Logistics",
    industry: "Logistics & Supply Chain",
    companySize: "101-250",
    contactNumber: "+63 46 512 7700",
    city: "Carmona",
    province: "Cavite",
    companyAddress: "Carmona Industrial Complex, Governor's Drive, Carmona, Cavite",
    companyDescription: "Comprehensive multimodal freight and warehouse distribution provider bridging Calabarzon manufacturing centers with national distribution corridors.",
    branches: [
      { name: "Central Distribution Terminal", address: "Carmona Industrial Complex, Carmona, Cavite" },
      { name: "North Gate Forwarding Depo", address: "Maduya, Carmona, Cavite" }
    ],
    latitude: 14.3142,
    longitude: 121.0544,
  },
  {
    email: "careers@imus-healthfirst.org",
    password: "Employer#HealthFirst2026",
    businessName: "HealthFirst Regional Medical Center",
    industry: "Healthcare & Pharmaceuticals",
    companySize: "201-500",
    contactNumber: "+63 46 471 3300",
    city: "Imus",
    province: "Cavite",
    companyAddress: "Aguinaldo Highway, Palico IV, Imus, Cavite",
    companyDescription: "Tertiary-level community healthcare center committed to advanced diagnostic services, emergency medicine, and compassionate patient care.",
    branches: [
      { name: "Main Hospital Complex", address: "Aguinaldo Highway, Palico IV, Imus, Cavite" },
      { name: "Outpatient Wellness Clinic", address: "Buhay na Tubig, Imus, Cavite" }
    ],
    latitude: 14.4296,
    longitude: 120.9367,
  },
  {
    email: "hiring@bacoor-digitalbpo.com",
    password: "Employer#BacoorBPO2026",
    businessName: "Bacoor NexGen BPO Solutions",
    industry: "BPO & Customer Operations",
    companySize: "501-1000",
    contactNumber: "+63 46 686 4500",
    city: "Bacoor",
    province: "Cavite",
    companyAddress: "Molino Boulevard, Niog III, Bacoor, Cavite",
    companyDescription: "Global customer experience enterprise delivering 24/7 technical helpdesk, customer retention, and back-office financial processing services.",
    branches: [
      { name: "Molino Boulevard Delivery Center", address: "Molino Boulevard, Niog III, Bacoor, Cavite" }
    ],
    latitude: 14.4608,
    longitude: 120.9631,
  },
  {
    email: "hr@trias-precisionmold.com",
    password: "Employer#TriasMold2026",
    businessName: "GenTri Advanced Tooling & Die Works",
    industry: "Manufacturing & Industrial",
    companySize: "101-250",
    contactNumber: "+63 46 433 9050",
    city: "General Trias",
    province: "Cavite",
    companyAddress: "Gateway Business Park, Javalera, General Trias, Cavite",
    companyDescription: "High-precision engineering and CNC die-casting plant providing structural components for automotive and consumer appliance assemblies.",
    branches: [
      { name: "Manufacturing Plant 1", address: "Gateway Business Park, Javalera, General Trias, Cavite" }
    ],
    latitude: 14.3854,
    longitude: 120.8814,
  },
  {
    email: "careers@silang-agribio.com",
    password: "Employer#AgriBio2026",
    businessName: "Silang BioOrganics Agro-Tech Corp.",
    industry: "Agriculture & Biotechnology",
    companySize: "51-200",
    contactNumber: "+63 46 865 2200",
    city: "Silang",
    province: "Cavite",
    companyAddress: "Biga II, Sta. Rosa-Tagaytay Road, Silang, Cavite",
    companyDescription: "Innovative agricultural research and greenhouse production facility promoting sustainable organic crops and smart fertigation systems.",
    branches: [
      { name: "Research & Processing Lab", address: "Biga II, Silang, Cavite" },
      { name: "Agritech Demonstration Farm", address: "Tibig, Silang, Cavite" }
    ],
    latitude: 14.2312,
    longitude: 120.9744,
  },
  {
    email: "info@trece-civildesign.ph",
    password: "Employer#TreceCivil2026",
    businessName: "Trece Metro Build & Structural Design",
    industry: "Construction & Real Estate",
    companySize: "11-50",
    contactNumber: "+63 46 419 6010",
    city: "Trece Martires",
    province: "Cavite",
    companyAddress: "Capitol Hills Executive Center, San Agustin, Trece Martires, Cavite",
    companyDescription: "Civil engineering consultancy and construction firm overseeing regional residential masterplans and municipal public infrastructure projects.",
    branches: [
      { name: "Main Corporate Office", address: "Capitol Hills Executive Center, San Agustin, Trece Martires, Cavite" }
    ],
    latitude: 14.2816,
    longitude: 120.8682,
  },
  {
    email: "careers@kawit-retailcorp.ph",
    password: "Employer#KawitRetail2026",
    businessName: "Horizon Retail Distribution Networks",
    industry: "Retail & E-Commerce",
    companySize: "201-500",
    contactNumber: "+63 46 484 7120",
    city: "Kawit",
    province: "Cavite",
    companyAddress: "Kawit Commercial Strip, Binakayan, Kawit, Cavite",
    companyDescription: "Fast-moving consumer goods distributor supplying hypermarkets, retail franchise chains, and e-commerce fulfillment hubs throughout Cavite.",
    branches: [
      { name: "Central Retail Depot", address: "Kawit Commercial Strip, Binakayan, Kawit, Cavite" },
      { name: "Fulfillment Center South", address: "Tabon 1, Kawit, Cavite" }
    ],
    latitude: 14.4447,
    longitude: 120.9025,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Connected to database:", DATABASE_URL);

    // 1. Seed Applicants
    console.log("\n--- Seeding 10 Applicants ---");
    for (const app of applicantsData) {
      const email = app.email.trim().toLowerCase();
      const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);

      let userId;
      const hash = await bcrypt.hash(app.password, 10);

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        await client.query(
          "UPDATE users SET password_hash = $1, is_active = TRUE WHERE id = $2",
          [hash, userId]
        );
        console.log(`Updated user: ${email} (ID: ${userId})`);
      } else {
        const userRes = await client.query(
          "INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, 'applicant', TRUE) RETURNING id",
          [email, hash]
        );
        userId = userRes.rows[0].id;
        console.log(`Created user: ${email} (ID: ${userId})`);
      }

      const consolidatedSalary = `PHP ${app.expectedSalaryMin.toLocaleString("en-US", { minimumFractionDigits: 2 })} - PHP ${app.expectedSalaryMax.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

      const profRes = await client.query("SELECT user_id FROM applicant_profiles WHERE user_id = $1", [userId]);
      if (profRes.rows.length > 0) {
        await client.query(
          `UPDATE applicant_profiles SET
            first_name = $1, middle_name = $2, last_name = $3, phone = $4,
            province = $5, city = $6, address = $7, desired_job_title = $8,
            expected_salary = $9, expected_salary_min = $10, expected_salary_max = $11,
            work_arrangement = $12, skills = $13, qualifications = $14, certifications = $15,
            summary = $16, languages = $17, shs_strand = $18, shs_school = $19,
            shs_grad_year = $20, college_grad_year = $21, vocational_grad_year = $22,
            is_non_graduate_cert_holder = $23, latitude = $24, longitude = $25,
            terms_accepted = TRUE, terms_accepted_at = CURRENT_TIMESTAMP
           WHERE user_id = $26`,
          [
            app.firstName, app.middleName, app.lastName, app.phone,
            app.province, app.city, app.address, app.desiredJobTitle,
            consolidatedSalary, app.expectedSalaryMin, app.expectedSalaryMax,
            app.workArrangement, app.skills, app.qualifications, app.certifications,
            app.summary, app.languages, app.shsStrand, app.shsSchool,
            app.shsGradYear, app.collegeGradYear, app.vocationalGradYear,
            app.isNonGradCert, app.latitude, app.longitude,
            userId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO applicant_profiles (
            user_id, first_name, middle_name, last_name, phone,
            province, city, address, desired_job_title,
            expected_salary, expected_salary_min, expected_salary_max,
            work_arrangement, skills, qualifications, certifications,
            summary, languages, shs_strand, shs_school,
            shs_grad_year, college_grad_year, vocational_grad_year,
            is_non_graduate_cert_holder, latitude, longitude,
            terms_accepted, terms_accepted_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, $20,
            $21, $22, $23,
            $24, $25, $26,
            TRUE, CURRENT_TIMESTAMP
          )`,
          [
            userId, app.firstName, app.middleName, app.lastName, app.phone,
            app.province, app.city, app.address, app.desiredJobTitle,
            consolidatedSalary, app.expectedSalaryMin, app.expectedSalaryMax,
            app.workArrangement, app.skills, app.qualifications, app.certifications,
            app.summary, app.languages, app.shsStrand, app.shsSchool,
            app.shsGradYear, app.collegeGradYear, app.vocationalGradYear,
            app.isNonGradCert, app.latitude, app.longitude,
          ]
        );
      }
    }

    // 2. Seed Employers
    console.log("\n--- Seeding 10 Employers ---");
    for (const emp of employersData) {
      const email = emp.email.trim().toLowerCase();
      const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);

      let userId;
      const hash = await bcrypt.hash(emp.password, 10);

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        await client.query(
          "UPDATE users SET password_hash = $1, is_active = TRUE WHERE id = $2",
          [hash, userId]
        );
        console.log(`Updated user: ${email} (ID: ${userId})`);
      } else {
        const userRes = await client.query(
          "INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, 'employer', TRUE) RETURNING id",
          [email, hash]
        );
        userId = userRes.rows[0].id;
        console.log(`Created user: ${email} (ID: ${userId})`);
      }

      const branchesJson = JSON.stringify(emp.branches);

      const profRes = await client.query("SELECT user_id FROM employer_profiles WHERE user_id = $1", [userId]);
      if (profRes.rows.length > 0) {
        await client.query(
          `UPDATE employer_profiles SET
            business_name = $1, contact_number = $2, province = $3, city = $4,
            company_address = $5, industry = $6, company_size = $7,
            company_description = $8, branches_json = $9, latitude = $10, longitude = $11,
            terms_accepted = TRUE, terms_accepted_at = CURRENT_TIMESTAMP
           WHERE user_id = $12`,
          [
            emp.businessName, emp.contactNumber, emp.province, emp.city,
            emp.companyAddress, emp.industry, emp.companySize,
            emp.companyDescription, branchesJson, emp.latitude, emp.longitude,
            userId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO employer_profiles (
            user_id, business_name, contact_number, province, city,
            company_address, industry, company_size,
            company_description, branches_json, latitude, longitude,
            terms_accepted, terms_accepted_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, $10, $11, $12,
            TRUE, CURRENT_TIMESTAMP
          )`,
          [
            userId, emp.businessName, emp.contactNumber, emp.province, emp.city,
            emp.companyAddress, emp.industry, emp.companySize,
            emp.companyDescription, branchesJson, emp.latitude, emp.longitude,
          ]
        );
      }
    }

    console.log("\nAll 10 Applicants and 10 Employers created successfully!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
