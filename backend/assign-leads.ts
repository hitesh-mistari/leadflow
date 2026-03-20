import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadflow'
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Get all users except harshada
    const { rows: users } = await client.query(`SELECT id, name FROM users WHERE LOWER(name) NOT LIKE '%harshada%'`);
    console.log(`Found ${users.length} users to assign leads to.`);

    for (const user of users) {
      // 2. Assign 100 unassigned leads to each user
      const updateQuery = `
          UPDATE leads
          SET assigned_to = $1
          WHERE id IN (
              SELECT id FROM leads 
              WHERE assigned_to IS NULL 
                AND is_archived IS NOT TRUE 
                AND status = 'not_called'
              ORDER BY created_at ASC
              LIMIT 100
              FOR UPDATE SKIP LOCKED
          )
          RETURNING id
      `;
      const { rows } = await client.query(updateQuery, [user.id]);
      console.log(`Assigned ${rows.length} leads to ${user.name} (ID: ${user.id})`);
    }

    console.log('Assignment complete.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
