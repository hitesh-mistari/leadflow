import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadflow'
});

async function run() {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`
      DELETE FROM leads 
      WHERE name ILIKE '%homespace%' 
         OR name ILIKE '%livespace%'
    `);
    console.log(`Successfully deleted ${rowCount} records matching "homespace" or "livespace".`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
