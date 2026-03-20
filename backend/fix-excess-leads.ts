import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadflow'
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows: users } = await client.query(`SELECT id, name FROM users`);
    
    for (const user of users) {
      // Find how many not_called leads they have
      const { rows: pending } = await client.query(
        `SELECT id FROM leads WHERE assigned_to = $1 AND status = 'not_called' AND is_archived IS NOT TRUE ORDER BY created_at ASC`,
        [user.id]
      );
      
      if (pending.length > 100) {
        const excessCount = pending.length - 100;
        // The ones beyond index 99 are excess. We will unassign the newest ones.
        const excessIds = pending.slice(100).map(r => r.id);
        
        await client.query(
          `UPDATE leads SET assigned_to = NULL WHERE id = ANY($1)`,
          [excessIds]
        );
        console.log(`Unassigned ${excessCount} excess leads from ${user.name}`);
      } else {
        console.log(`${user.name} has ${pending.length} pending leads (<= 100).`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
