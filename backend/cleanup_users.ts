import pkg from 'pg';
import 'dotenv/config';

const pool = new pkg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanup() {
    try {
        console.log('--- Cleaning up unwanted users ---');
        const res = await pool.query("DELETE FROM users WHERE email IN ('ravi@leadflow.com', 'admin@leadflow.com')");
        console.log(`✅ Deleted ${res.rowCount} default accounts (Admin and Ravi Kumar).`);
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
