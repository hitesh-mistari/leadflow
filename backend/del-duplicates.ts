import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadflow'
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT COUNT(*) FROM leads WHERE name ILIKE '%Space Fiber%'`);
    console.log(`Found ${rows[0].count} records for Space Fiber Lighting`);
    
    // Delete all duplicates, keeping only the FIRST ONE that was imported
    const del = await client.query(`
      DELETE FROM leads 
      WHERE name ILIKE '%Space Fiber%' 
      AND id NOT IN (
          SELECT MIN(id) 
          FROM leads 
          WHERE name ILIKE '%Space Fiber%'
      )
    `);
    console.log(`Successfully deleted ${del.rowCount} duplicate records! Kept exactly 1.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
