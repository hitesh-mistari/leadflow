
import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
    console.log('Columns in leads table:', res.rows.map(r => r.column_name).join(', '));
    const tasksRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'");
    console.log('Columns in tasks table:', tasksRes.rows.map(r => r.column_name).join(', '));
    const sample = await pool.query("SELECT * FROM leads LIMIT 1");
    console.log('Sample lead structure:', JSON.stringify(sample.rows[0], null, 2));
    const cityCheck = await pool.query("SELECT city, COUNT(*) FROM leads GROUP BY city");
    console.log('City distribution:', JSON.stringify(cityCheck.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
check();
