
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function check() {
    const tables = ['users', 'leads', 'call_logs', 'import_history', 'tasks', 'pipeline_stages'];
    for (const t of tables) {
        try {
            const r = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_name = $1', [t]);
            console.log(`${t} exists: ${r.rows.length > 0}`);
        } catch (err) {
            console.log(`${t} check failed: ${err.message}`);
        }
    }
}

check().finally(() => pool.end());
