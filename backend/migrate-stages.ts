import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function migrate() {
    try {
        console.log('Creating pipeline_stages table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pipeline_stages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                label VARCHAR(255) NOT NULL,
                color VARCHAR(50) DEFAULT 'slate',
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert defaults if empty
        const { rows } = await pool.query('SELECT COUNT(*) FROM pipeline_stages');
        if (parseInt(rows[0].count) === 0) {
            console.log('Inserting default pipeline stages...');
            await pool.query(`
                INSERT INTO pipeline_stages (name, label, color, position) VALUES
                ('not_called', 'Not Called', 'slate', 0),
                ('called_no_response', 'Called (No Response)', 'amber', 1),
                ('called_busy', 'Called (Busy)', 'amber', 2),
                ('follow_up', 'Follow Up', 'blue', 3),
                ('interested', 'Interested', 'rose', 4),
                ('converted', 'Converted', 'emerald', 5),
                ('not_interested', 'Not Interested', 'red', 6),
                ('closed', 'Closed', 'slate', 7)
            `);
        }
        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
