import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── Hardcoded Users ──────────────────────────────────────────────────────────
// These 5 users are the ONLY people who can log in.
// They are seeded into the remote PostgreSQL database on every server startup,
// so you can see them in pgAdmin too.
const HARDCODED_USERS = [
    { name: 'Admin', email: 'admin@leadflow.com', password: 'Admin@123' },
    { name: 'Ravi', email: 'ravi@leadflow.com', password: 'Ravi@123' },
    { name: 'Priya', email: 'priya@leadflow.com', password: 'Priya@123' },
    { name: 'Arjun', email: 'arjun@leadflow.com', password: 'Arjun@123' },
    { name: 'Sneha', email: 'sneha@leadflow.com', password: 'Sneha@123' },
];

const { Pool } = pkg;

// ─── Database Connection ───────────────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

const JWT_SECRET = process.env.JWT_SECRET || 'leadflow-fallback-secret';
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Initialize Tables ────────────────────────────────────────────────────────
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        place_id TEXT UNIQUE,
        name TEXT,
        phone TEXT,
        website TEXT,
        rating REAL,
        reviews INTEGER,
        description TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        main_category TEXT,
        categories TEXT,
        workday_timing TEXT,
        is_temporarily_closed BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'not_called',
        notes TEXT,
        last_called TIMESTAMPTZ,
        next_followup TIMESTAMPTZ,
        call_attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        duration INTEGER,
        outcome TEXT,
        notes TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS import_history (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        total_records INTEGER DEFAULT 0,
        imported_count INTEGER DEFAULT 0,
        skipped_count INTEGER DEFAULT 0,
        imported_by TEXT,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        imported_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ Database tables initialized');

        // Add 'name' column to users table if it doesn't exist yet (safe migration)
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
        `);

        // Safe migration for import_history columns
        await client.query(`
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0;
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS imported_count INTEGER DEFAULT 0;
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0;
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS imported_by TEXT;
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
          ALTER TABLE import_history ADD COLUMN IF NOT EXISTS error_message TEXT;
        `);
        console.log('✅ import_history schema verified');
        console.log('✅ import_history table ready');

        await seedUsers(client);
        await seedDatabase(client);
    } finally {
        client.release();
    }
};

// ─── Seed Hardcoded Users into PostgreSQL ─────────────────────────────────────
// Runs on every startup. Uses ON CONFLICT DO NOTHING so it's safe to re-run.
// The 5 users will always be visible in pgAdmin / remote DB.
const seedUsers = async (client: pkg.PoolClient) => {
    console.log('👤 Syncing hardcoded users to database...');
    for (const user of HARDCODED_USERS) {
        const hashed = await bcrypt.hash(user.password, 10);
        await client.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password`,
            [user.name, user.email, hashed]
        );
    }
    console.log('✅ Users synced to database:', HARDCODED_USERS.map(u => u.email).join(', '));
};

// ─── Seed Demo Data ───────────────────────────────────────────────────────────
const seedDatabase = async (client: pkg.PoolClient) => {
    const { rows } = await client.query('SELECT COUNT(*) as count FROM leads');
    if (parseInt(rows[0].count) > 0) return;

    console.log('🌱 Seeding demo data...');

    const demoLeads = [
        { place_id: 'p1', name: 'Skyline Architecture', phone: '+1 555-0101', website: 'https://skyline-arch.com', rating: 4.8, reviews: 1250, description: 'Leading architecture firm specializing in sustainable urban design.', address: '450 Market St, San Francisco, CA', lat: 37.7897, lng: -122.3998, main_category: 'Architect', categories: 'Architect, Urban Planner', workday_timing: '9am–6pm', status: 'interested' },
        { place_id: 'p2', name: 'Green Leaf Landscaping', phone: '+1 555-0102', website: 'https://greenleaf.io', rating: 4.5, reviews: 850, description: 'Premium residential and commercial landscaping services.', address: '1200 Valencia St, San Francisco, CA', lat: 37.7523, lng: -122.4215, main_category: 'Landscaper', categories: 'Landscaper, Garden Center', workday_timing: '8am–5pm', status: 'follow_up' },
        { place_id: 'p3', name: 'TechNova Solutions', phone: '+1 555-0103', website: 'https://technova.net', rating: 4.9, reviews: 3200, description: 'Innovative software development and cloud consulting.', address: '101 California St, San Francisco, CA', lat: 37.7932, lng: -122.3995, main_category: 'IT Services', categories: 'Software Company, IT Consultant', workday_timing: '10am–7pm', status: 'converted' },
        { place_id: 'p4', name: 'Blue Harbor Logistics', phone: '+1 555-0104', website: 'https://blueharbor.com', rating: 4.2, reviews: 450, description: 'Global shipping and supply chain management experts.', address: 'Pier 39, San Francisco, CA', lat: 37.8086, lng: -122.4098, main_category: 'Logistics', categories: 'Freight Forwarder, Warehouse', workday_timing: '24/7', status: 'not_called' },
        { place_id: 'p5', name: 'Golden Gate Bakery', phone: '+1 555-0105', website: 'https://ggbakery.com', rating: 4.7, reviews: 5600, description: 'Famous local bakery known for sourdough and pastries.', address: '1029 Grant Ave, San Francisco, CA', lat: 37.7963, lng: -122.4068, main_category: 'Bakery', categories: 'Bakery, Cafe', workday_timing: '7am–4pm', status: 'not_interested' },
        { place_id: 'p6', name: 'Summit Law Group', phone: '+1 555-0106', website: 'https://summitlaw.com', rating: 4.6, reviews: 210, description: 'Specializing in corporate law and intellectual property.', address: '555 California St, San Francisco, CA', lat: 37.7922, lng: -122.4038, main_category: 'Law Firm', categories: 'Lawyer, Legal Services', workday_timing: '9am–5pm', status: 'interested' },
        { place_id: 'p7', name: 'Urban Fitness Hub', phone: '+1 555-0107', website: 'https://urbanfitness.fit', rating: 4.4, reviews: 1100, description: 'Modern gym with state-of-the-art equipment and personal training.', address: '200 Brannan St, San Francisco, CA', lat: 37.7832, lng: -122.3915, main_category: 'Gym', categories: 'Fitness Center, Personal Trainer', workday_timing: '5am–11pm', status: 'follow_up' },
        { place_id: 'p8', name: 'Pacific Dental Care', phone: '+1 555-0108', website: 'https://pacificdental.com', rating: 4.8, reviews: 940, description: 'Comprehensive family and cosmetic dentistry.', address: '2100 Webster St, San Francisco, CA', lat: 37.7895, lng: -122.4325, main_category: 'Dentist', categories: 'Dentist, Dental Clinic', workday_timing: '8am–6pm', status: 'not_called' },
    ];

    for (let i = 0; i < demoLeads.length; i++) {
        const lead = demoLeads[i];
        const lastCalledDate = new Date();
        lastCalledDate.setDate(lastCalledDate.getDate() - (i % 5));

        const { rows: insertedRows } = await client.query(
            `INSERT INTO leads (place_id, name, phone, website, rating, reviews, description, address,
        latitude, longitude, main_category, categories, workday_timing, status, last_called)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (place_id) DO NOTHING
       RETURNING id`,
            [lead.place_id, lead.name, lead.phone, lead.website, lead.rating, lead.reviews,
            lead.description, lead.address, lead.lat, lead.lng, lead.main_category,
            lead.categories, lead.workday_timing, lead.status,
            lead.status !== 'not_called' ? lastCalledDate.toISOString() : null]
        );

        if (insertedRows.length > 0 && lead.status !== 'not_called') {
            const leadId = insertedRows[0].id;
            const callCount = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < callCount; j++) {
                const callDate = new Date(lastCalledDate);
                callDate.setHours(callDate.getHours() - (j * 2));
                await client.query(
                    `INSERT INTO call_logs (lead_id, duration, outcome, notes, timestamp) VALUES ($1,$2,$3,$4,$5)`,
                    [leadId, Math.floor(Math.random() * 300) + 30, j === callCount - 1 ? lead.status : 'called_no_response', `Demo call log entry ${j + 1}`, callDate.toISOString()]
                );
            }
        }
    }
    console.log('✅ Demo data seeded successfully');
};

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
    origin: [FRONTEND_URL, 'http://localhost:5174'],
    credentials: true,
}));
app.use(express.json({ limit: '500mb' }));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────
// Login: verifies against the hardcoded users stored in the remote PostgreSQL DB.
// Only the 5 seeded users can ever log in.
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    try {
        console.log(`🔑 Login attempt for: ${email}`);
        // Look up user in the remote database
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare entered password against bcrypt hash stored in DB
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Issue JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get current user info from token
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
});

// ─── Lead Routes ───────────────────────────────────────────────────────────────
app.get('/api/leads', authenticateToken, async (req, res) => {
    const { status, search, page = 1, limit = 20, sort = 'id', order = 'DESC' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let conditions = '1=1';
    let idx = 1;

    if (status) {
        conditions += ` AND status = $${idx++}`;
        params.push(status);
    }
    if (search) {
        conditions += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx} OR main_category ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
    }

    const allowedSorts = ['id', 'name', 'rating', 'status', 'created_at', 'last_called', 'call_attempts'];
    const safeSort = allowedSorts.includes(sort as string) ? sort : 'id';
    const safeOrder = (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE ${conditions}`, params);
    const total = parseInt(countResult.rows[0].count);

    const queryParams = [...params, Number(limit), offset];
    const leads = await pool.query(
        `SELECT * FROM leads WHERE ${conditions} ORDER BY ${safeSort} ${safeOrder} LIMIT $${idx++} OFFSET $${idx++}`,
        queryParams
    );

    res.json({ leads: leads.rows, total, page: Number(page), limit: Number(limit) });
});

app.post('/api/leads/import', authenticateToken, async (req: any, res) => {
    let rawData = req.body.leads || req.body;
    let filename = req.body.filename || 'unknown.json';

    // ── Smart Array Finder: If not an array, find the largest array in the object ──
    let leads: any[] = [];
    if (Array.isArray(rawData)) {
        leads = rawData;
    } else if (rawData && typeof rawData === 'object') {
        // Find the biggest array inside the object (common in diverse scaper exports)
        let maxArr: any[] = [];
        for (const k in rawData) {
            if (Array.isArray(rawData[k]) && rawData[k].length > maxArr.length) {
                maxArr = rawData[k];
            }
        }
        if (maxArr.length > 0) {
            leads = maxArr;
        } else {
            // Single object fallback
            leads = [rawData];
        }
    }

    if (!leads || leads.length === 0) {
        return res.status(400).json({ error: 'No data found. Upload a JSON array or object containing leads.' });
    }

    const client = await pool.connect();
    let importedCount = 0;
    let skippedCount = 0;

    try {
        await client.query('BEGIN');

        for (const raw of leads) {
            // ── Ultra-Flexible field mapping helper ──
            const getVal = (patterns: string[]) => {
                const keys = Object.keys(raw);
                // Exact or normalized match
                for (const p of patterns) {
                    const normalizedP = p.toLowerCase().replace(/[\s_-]/g, '');
                    if (raw[p] !== undefined) return raw[p];
                    const foundKey = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normalizedP);
                    if (foundKey) return raw[foundKey];
                }
                // Partial match fallback (e.g. "business name" contains "name")
                for (const p of patterns) {
                    const foundKey = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
                    if (foundKey) return raw[foundKey];
                }
                return null;
            };

            const name = getVal(['name', 'title', 'business', 'company']) || '';
            const phone = getVal(['phone', 'telephone', 'contact', 'mobile']) || '';
            const website = getVal(['website', 'url', 'site', 'web', 'link']) || '';

            // Safe number parsing (strips non-numeric like "1,200+")
            const safeFloat = (v: any) => parseFloat(String(v || '0').replace(/[^\d.]/g, '')) || 0;
            const safeInt = (v: any) => parseInt(String(v || '0').replace(/[^\d]/g, '')) || 0;

            const rating = safeFloat(getVal(['rating', 'stars', 'score']));
            const reviews = safeInt(getVal(['reviews', 'review_count', 'reviewCount', 'user_ratings_total']));
            const description = getVal(['description', 'about', 'desc', 'bio', 'summary']) || '';
            const address = getVal(['address', 'location', 'street']) || '';
            const latitude = safeFloat(getVal(['latitude', 'lat']) || raw.location?.lat || 0);
            const longitude = safeFloat(getVal(['longitude', 'lng', 'lon']) || raw.location?.lng || 0);
            const main_category = getVal(['main_category', 'category', 'type', 'primary_category']) || '';
            const categories = getVal(['categories', 'tags']) || (main_category ? [main_category] : '');
            const workday_timing = getVal(['timing', 'hours', 'time']) || '';
            const is_temporarily_closed = !!getVal(['closed', 'temporary']) ? 1 : 0;

            // Stable place_id: use provided ID or fallback to name+phone fingerprint
            let place_id = getVal(['place_id', 'placeId', 'google_id', 'id', 'cid']);
            if (!place_id && name && phone) {
                place_id = `id_${name.replace(/\s/g, '')}_${phone.replace(/\D/g, '')}`;
            } else if (!place_id) {
                place_id = `import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            }

            // Skip entries with no name AND no phone
            if (!name && !phone) {
                if (skippedCount < 3) {
                    console.log('Skipping record - no name or phone found. Keys:', Object.keys(raw));
                    console.log('Record content:', JSON.stringify(raw));
                }
                skippedCount++;
                continue;
            }

            // Handle categories as array or string
            const categoriesStr = Array.isArray(categories) ? categories.join(', ') : String(categories || '');

            try {
                await client.query(`SAVEPOINT sp_${importedCount + skippedCount}`);
                const result = await client.query(
                    `INSERT INTO leads (place_id, name, description, phone, website, rating, reviews, address,
                      latitude, longitude, main_category, categories, workday_timing, is_temporarily_closed)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                     ON CONFLICT (place_id) DO UPDATE SET
                       name = EXCLUDED.name,
                       description = EXCLUDED.description,
                       phone = EXCLUDED.phone,
                       website = EXCLUDED.website,
                       rating = EXCLUDED.rating,
                       reviews = EXCLUDED.reviews,
                       address = EXCLUDED.address,
                       latitude = EXCLUDED.latitude,
                       longitude = EXCLUDED.longitude,
                       main_category = EXCLUDED.main_category,
                       categories = EXCLUDED.categories,
                       workday_timing = EXCLUDED.workday_timing,
                       is_temporarily_closed = EXCLUDED.is_temporarily_closed
                     RETURNING id`,
                    [place_id, name, description, phone, website, rating, reviews, address,
                        latitude, longitude, main_category, categoriesStr, workday_timing, is_temporarily_closed]
                );
                await client.query(`RELEASE SAVEPOINT sp_${importedCount + skippedCount}`);
                if (result.rowCount && result.rowCount > 0) {
                    importedCount++;
                } else {
                    skippedCount++;
                }
            } catch (insertErr) {
                await client.query(`ROLLBACK TO SAVEPOINT sp_${importedCount + skippedCount}`);
                console.error('Insert error for lead:', name, insertErr);
                skippedCount++;
            }
        }

        // Log import in history
        await client.query(
            `INSERT INTO import_history (filename, total_records, imported_count, skipped_count, imported_by, status)
             VALUES ($1, $2, $3, $4, $5, 'success')`,
            [filename, leads.length, importedCount, skippedCount, req.user?.email || 'unknown']
        );

        await client.query('COMMIT');
        res.json({
            message: 'Import successful',
            total: leads.length,
            imported: importedCount,
            skipped: skippedCount
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Import error:', err);

        // Still log failed import
        try {
            await pool.query(
                `INSERT INTO import_history (filename, total_records, imported_count, skipped_count, imported_by, status, error_message)
                 VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
                [filename, leads?.length || 0, importedCount, skippedCount, req.user?.email || 'unknown', err.message]
            );
        } catch (_) { }

        res.status(500).json({ error: 'Import failed: ' + err.message });
    } finally {
        client.release();
    }
});

// ─── Import History ────────────────────────────────────────────────────────────
app.get('/api/imports', authenticateToken, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM import_history ORDER BY imported_at DESC LIMIT 50'
    );
    res.json(rows);
});

app.delete('/api/imports/:id', authenticateToken, async (req, res) => {
    await pool.query('DELETE FROM import_history WHERE id = $1', [req.params.id]);
    res.json({ message: 'Import history entry deleted' });
});

app.get('/api/leads/:id', authenticateToken, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
    const { status, notes, last_called, next_followup, call_attempts } = req.body;
    await pool.query(
        `UPDATE leads SET
      status = COALESCE($1, status),
      notes = COALESCE($2, notes),
      last_called = COALESCE($3, last_called),
      next_followup = COALESCE($4, next_followup),
      call_attempts = COALESCE($5, call_attempts)
     WHERE id = $6`,
        [status, notes, last_called, next_followup, call_attempts, req.params.id]
    );
    res.json({ message: 'Lead updated' });
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead deleted' });
});

// ─── Call Log Routes ───────────────────────────────────────────────────────────
app.post('/api/calls', authenticateToken, async (req, res) => {
    const { lead_id, duration, outcome, notes } = req.body;
    await pool.query(
        `INSERT INTO call_logs (lead_id, duration, outcome, notes) VALUES ($1,$2,$3,$4)`,
        [lead_id, duration, outcome, notes]
    );
    await pool.query(
        `UPDATE leads SET last_called = NOW(), call_attempts = call_attempts + 1 WHERE id = $1`,
        [lead_id]
    );
    res.status(201).json({ message: 'Call logged' });
});

app.get('/api/leads/:id/calls', authenticateToken, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM call_logs WHERE lead_id = $1 ORDER BY timestamp DESC',
        [req.params.id]
    );
    res.json(rows);
});

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    const [totalLeads, callsToday, interested, converted, statusDist, callsPerDay, avgDur, outcomeDist] =
        await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM leads'),
            pool.query(`SELECT COUNT(*) as count FROM leads WHERE last_called::date = CURRENT_DATE`),
            pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'interested'`),
            pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'converted'`),
            pool.query('SELECT status, COUNT(*) as count FROM leads GROUP BY status'),
            pool.query(`SELECT DATE(timestamp) as date, COUNT(*) as count FROM call_logs GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 7`),
            pool.query('SELECT AVG(duration) as avg FROM call_logs'),
            pool.query('SELECT outcome, COUNT(*) as count FROM call_logs GROUP BY outcome'),
        ]);

    res.json({
        totalLeads: parseInt(totalLeads.rows[0].count),
        callsToday: parseInt(callsToday.rows[0].count),
        interested: parseInt(interested.rows[0].count),
        converted: parseInt(converted.rows[0].count),
        statusDistribution: statusDist.rows.map(r => ({ ...r, count: parseInt(r.count) })),
        callsPerDay: callsPerDay.rows.reverse().map(r => ({ ...r, count: parseInt(r.count) })),
        avgDuration: Math.round(parseFloat(avgDur.rows[0].avg) || 0),
        outcomeDistribution: outcomeDist.rows.map(r => ({ ...r, count: parseInt(r.count) })),
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 LeadFlow Backend running on http://localhost:${PORT}`);
        console.log(`📊 Connected to PostgreSQL database`);
        console.log(`🌐 Accepting requests from: ${FRONTEND_URL}`);
    });
}).catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
});
