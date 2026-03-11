
import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
async function inspect() {
  try {
    const res = await pool.query("SELECT address FROM leads WHERE address IS NOT NULL AND address != '' LIMIT 10");
    console.log('Real Address Samples:', JSON.stringify(res.rows.map(r => r.address), null, 2));
    
    const countWithComma = await pool.query("SELECT COUNT(*) FROM leads WHERE address LIKE '%,%'");
    console.log('Leads with potential parseable addresses:', countWithComma.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
inspect();
