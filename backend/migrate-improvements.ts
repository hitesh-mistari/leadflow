import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Running improvements migration...');
  await pool.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
  `);
  await pool.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);
  console.log('Migration complete!');
  await pool.end();
}
migrate().catch(console.error);
