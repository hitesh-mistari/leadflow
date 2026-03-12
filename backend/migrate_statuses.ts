import pkg from 'pg';
import 'dotenv/config';

const pool = new pkg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('--- Database Migration Started ---');
    try {
        const stages = await pool.query('SELECT id, name FROM pipeline_stages');
        console.log(`Found ${stages.rowCount} stages.`);

        for (const stage of stages.rows) {
            const res = await pool.query(
                'UPDATE leads SET status = $1 WHERE status = $2',
                [stage.name, String(stage.id)]
            );
            if (res.rowCount > 0) {
                console.log(`Updated ${res.rowCount} leads: '${stage.id}' -> '${stage.name}'`);
            }
        }
        console.log('--- Migration Completed Successfully ---');
    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
