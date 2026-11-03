import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const DATABASE_URL = (process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/elitecruit").trim();
const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  console.log("Connecting to database:", DATABASE_URL.replace(/:[^:]*@/, ":****@"));

  // 1. Create genders data table
  console.log("Creating genders table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS genders (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed standard options
  await pool.query(`
    INSERT INTO genders (name) VALUES
      ('Male'),
      ('Female'),
      ('Other'),
      ('Prefer not to say')
    ON CONFLICT (name) DO NOTHING;
  `);

  const genderRows = await pool.query("SELECT * FROM genders ORDER BY id ASC");
  console.log("Genders table seeded:", genderRows.rows);

  // 2. Add gender column to applicant_profiles if not exists
  console.log("Adding gender column to applicant_profiles if not exists...");
  await pool.query(`
    ALTER TABLE applicant_profiles 
    ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Prefer not to say';
  `);

  // 3. Ensure all currently existing records get 'Prefer not to say'
  console.log("Updating all existing applicant profiles to 'Prefer not to say'...");
  const updateRes = await pool.query(`
    UPDATE applicant_profiles
    SET gender = 'Prefer not to say'
    WHERE gender IS NULL OR gender = '';
  `);
  console.log(`Updated ${updateRes.rowCount} existing applicant profiles.`);

  // 4. Verify existing records
  const sample = await pool.query(`
    SELECT user_id, first_name, last_name, gender 
    FROM applicant_profiles 
    ORDER BY user_id ASC
  `);
  console.log("Total applicant profiles:", sample.rowCount);
  console.log("Applicant profiles sample with gender:");
  console.table(sample.rows);

  await pool.end();
  console.log("Gender migration completed successfully!");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  pool.end().catch(() => {});
  process.exit(1);
});
