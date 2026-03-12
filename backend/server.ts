import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';



const { Pool } = pkg;

// ─── Database Connection ───────────────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
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
        city TEXT,
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
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_called_by INTEGER REFERENCES users(id);
          ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
          ALTER TABLE leads ADD COLUMN IF NOT EXISTS import_id INTEGER REFERENCES import_history(id) ON DELETE CASCADE;
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

        // Safe: seed default admin if admin user doesn't exist
        const { rows: userCount } = await client.query("SELECT COUNT(*) as count FROM users WHERE email = 'admin@leadflow.com'");
        if (parseInt(userCount[0].count) === 0) {
            console.log('👤 No users found — creating default admin account...');
            const DEFAULT_USERS = [
                { name: 'Admin', email: 'admin@leadflow.com', password: 'Admin@123' },
                { name: 'Ravi Kumar', email: 'ravi@leadflow.com', password: 'Ravi@123' },
            ];
            for (const u of DEFAULT_USERS) {
                const hashed = await bcrypt.hash(u.password, 10);
                await client.query(
                    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
                    [u.name, u.email.toLowerCase(), hashed]
                );
            }
            console.log('✅ Default users created: admin@leadflow.com / Admin@123');
        }

        // Removed automatic seeding to allow for clean database
        // await seedDatabase(client);
    } finally {
        client.release();
    }
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

// Add X-Robots-Tag to deter indexing
app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
});

app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const validateId = (req: any, res: any, next: any) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: `Invalid ID parameter: ${req.params.id}` });
    req.params.id = id; // Replace with parsed integer
    next();
};

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────
// Login: verifies against the hardcoded users stored in the remote PostgreSQL DB.
// Only the 5 seeded users can ever log in.
app.post('/api/auth/login', async (req: any, res: any) => {
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
            console.log(`Failed: User not found for email: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare entered password against bcrypt hash stored in DB
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log(`Failed: Password mismatch for ${email}. Entered password: ${password}. Db Hash: ${user.password}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Issue JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/auth/register', async (req: any, res: any) => {
    const { name, email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const emailLower = email.toLowerCase().trim();
        let finalName = name;
        if (!finalName || finalName === 'New User') {
            // Remove numbers and special characters, keep only alphabets
            finalName = emailLower.split('@')[0].replace(/[^a-zA-Z]/g, '');
            // Capitalize first letter
            finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
        }
        const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [emailLower]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows } = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [finalName, emailLower, hashedPassword]
        );

        const user = rows[0];

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Get current user info from token
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
});

// Update profile info
app.put('/api/auth/profile', authenticateToken, async (req: any, res: any) => {
    const { name, email, password } = req.body;
    const userId = req.user.id;

    try {
        const updates = [];
        const values = [];
        let i = 1;

        if (name) {
            updates.push(`name = $${i++}`);
            values.push(name);
        }
        if (email) {
            updates.push(`email = $${i++}`);
            values.push(email.toLowerCase().trim());
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(`password = $${i++}`);
            values.push(hashedPassword);
        }

        if (updates.length === 0) return res.json({ message: 'No changes provided' });

        values.push(userId);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
            values
        );

        const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
        res.json({ message: 'Profile updated successfully', user: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// ─── Pipeline Stages Routes ────────────────────────────────────────────────────
app.get('/api/stages', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM pipeline_stages ORDER BY position ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching stages' });
    }
});

app.post('/api/stages', authenticateToken, async (req, res) => {
    try {
        const { name, label, color = 'slate' } = req.body;

        // Find highest position
        const { rows: posRows } = await pool.query('SELECT MAX(position) as max_pos FROM pipeline_stages');
        const nextPos = (posRows[0].max_pos || 0) + 1;

        const { rows } = await pool.query(
            'INSERT INTO pipeline_stages (name, label, color, position) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, label, color, nextPos]
        );
        res.status(201).json(rows[0]);
    } catch (err: any) {
        console.error(err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'A stage with this exact programmatic name already exists' });
        }
        res.status(500).json({ error: 'Failed to create stage' });
    }
});

// ─── Lead Routes ───────────────────────────────────────────────────────────────
// Get Leads (paginated / filtered / sorted)
app.get('/api/leads', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1, limit = 10, search, status, city,
            sortBy = 'created_at', order = 'desc', from, to
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const allowedSorts = ['name', 'rating', 'status', 'main_category', 'created_at', 'last_called'];
        const safeSortCol = allowedSorts.includes(String(sortBy)) ? String(sortBy) : 'created_at';
        const safeOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let query = `
            SELECT l.*, u.name as last_called_by_name 
            FROM leads l 
            LEFT JOIN users u ON l.last_called_by = u.id 
            WHERE l.is_archived IS NOT TRUE
        `;
        let countQuery = 'SELECT COUNT(*) FROM leads WHERE is_archived IS NOT TRUE';
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            countQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (city) {
            query += ` AND city = $${paramIndex}`;
            countQuery += ` AND city = $${paramIndex}`;
            params.push(city);
            paramIndex++;
        }

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR main_category ILIKE $${paramIndex})`;
            countQuery += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR main_category ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (from) {
            query += ` AND created_at >= $${paramIndex}`;
            countQuery += ` AND created_at >= $${paramIndex}`;
            params.push(from);
            paramIndex++;
        }

        if (to) {
            query += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
            countQuery += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
            params.push(to);
            paramIndex++;
        }

        query += ` ORDER BY ${safeSortCol} ${safeOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const queryParams = [...params, limit, offset];

        const [leadsRes, countRes] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, params)
        ]);

        res.json({
            leads: leadsRes.rows,
            total: parseInt(countRes.rows[0].count),
            page: Number(page),
            totalPages: Math.ceil(parseInt(countRes.rows[0].count) / Number(limit))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leads/cities', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT city FROM leads WHERE city IS NOT NULL AND city != \'\' ORDER BY city ASC');
        res.json(result.rows.map(r => r.city));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), message: 'Server is running latest extraction logic v4' });
});

// Export Leads
app.get('/api/leads/export', authenticateToken, async (req, res) => {
    try {
        const { search, status, city, format = 'csv' } = req.query;

        let query = 'SELECT name, phone, email, city, status, rating, reviews, main_category, address, website, created_at, notes FROM leads WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (city) {
            query += ` AND city = $${paramIndex}`;
            params.push(city);
            paramIndex++;
        }

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        const { rows } = await pool.query(query, params);

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="leads_export.json"');
            return res.status(200).send(JSON.stringify(rows, null, 2));
        }

        // CSV Format
        if (rows.length === 0) {
            return res.status(200).send('No records found');
        }

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row =>
            Object.values(row).map(val => {
                const str = String(val || '');
                // Escape quotes and wrap in quotes if there's a comma
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        );

        const csvContent = [headers, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
        return res.status(200).send(csvContent);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during export' });
    }
});

app.post('/api/leads/import', authenticateToken, async (req: any, res) => {
    console.log(`📥 IMPORT TRIGGERED: ${req.body.filename || 'unknown'} | City fallback: [${req.body.city || 'none'}]`);
    let rawData = req.body.leads || req.body;
    let filename = req.body.filename || 'unknown.json';
    let city = req.body.city || '';
    let fileSize = req.body.size || 0;

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
    let importId: number | null = null;

    try {
        await client.query('BEGIN');

        // Create the import record first to get an ID for cascading link
        const importRes = await client.query(
            `INSERT INTO import_history (filename, total_records, imported_by, status, city, file_size)
             VALUES ($1, $2, $3, 'processing', $4, $5) RETURNING id`,
            [filename, leads.length, req.user?.email || 'unknown', city, fileSize]
        );
        importId = importRes.rows[0].id;

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
            
            // ── Robust City Extraction ──
            const extractCity = () => {
                // 1. Direct fields
                const c = getVal(['city', 'town', 'location_city', 'municipality', 'locality', 'suburb', 'district', 'area', 'region', 'city_name']);
                if (c) return String(c);

                // 2. Nested location
                if (raw.location && typeof raw.location === 'object') {
                    if (raw.location.city) return String(raw.location.city);
                    if (raw.location.locality) return String(raw.location.locality);
                    if (raw.location.town) return String(raw.location.town);
                }

                // 3. Address components
                if (Array.isArray(raw.address_components)) {
                    const loc = raw.address_components.find((comp: any) => comp.types?.includes('locality'));
                    if (loc) return String(loc.long_name || loc.short_name);
                }

                // 4. Parse from address string
                if (address && address.includes(',')) {
                    const parts = address.split(',').map(p => p.trim());
                    if (parts.length >= 3) {
                        const last = parts[parts.length - 1].toLowerCase();
                        const candidate = (last === 'india' || last.length < 3) ? parts[parts.length - 3] : parts[parts.length - 2];
                        const cleaned = candidate?.replace(/\d+/g, '').trim();
                        if (cleaned && cleaned.length > 2) return cleaned;
                    } else if (parts.length === 2) {
                        const cleaned = parts[0].replace(/\d+/g, '').trim();
                        if (cleaned && cleaned.length > 2) return cleaned;
                    }
                }
                
                return city; // Global fallback from req.body.city
            };
            const leadCity = extractCity();

            if (importedCount === 0 || importedCount % 50 === 0) {
                console.log(`DEBUG: Lead [${name}] -> Extracted City: [${leadCity}]`);
            }

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
                      latitude, longitude, main_category, categories, workday_timing, is_temporarily_closed, city, import_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
                       is_temporarily_closed = EXCLUDED.is_temporarily_closed,
                       city = EXCLUDED.city,
                       import_id = EXCLUDED.import_id
                     RETURNING id`,
                    [place_id, name, description, phone, website, rating, reviews, address,
                        latitude, longitude, main_category, categoriesStr, workday_timing, is_temporarily_closed, leadCity, importId]
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

        // Update import record with final status and counts
        await client.query(
            `UPDATE import_history SET imported_count = $1, skipped_count = $2, status = 'success' WHERE id = $3`,
            [importedCount, skippedCount, importId]
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
                `INSERT INTO import_history (filename, total_records, imported_count, skipped_count, imported_by, status, error_message, city, file_size)
                 VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7, $8)`,
                [filename, leads?.length || 0, importedCount, skippedCount, req.user?.email || 'unknown', err.message, city, fileSize]
            );
        } catch (_) { }

        res.status(500).json({ error: 'Import failed: ' + err.message });
    } finally {
        client.release();
    }
});

app.get('/api/leads/cities', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT DISTINCT city FROM leads WHERE city IS NOT NULL AND city != \'\' ORDER BY city ASC');
        res.json(rows.map(r => r.city));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching cities' });
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
    if (req.params.id === '-1') {
        await pool.query('DELETE FROM import_history');
        return res.json({ message: 'All import history cleared' });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    
    await pool.query('DELETE FROM import_history WHERE id = $1', [id]);
    res.json({ message: 'Import history entry deleted' });
});

app.get('/api/leads/:id', authenticateToken, validateId, async (req: any, res) => {
    const { rows } = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
});

app.put('/api/leads/:id', authenticateToken, validateId, async (req, res) => {
    const allowedFields: Record<string, string> = {
        status: 'status', notes: 'notes', last_called: 'last_called',
        next_followup: 'next_followup', call_attempts: 'call_attempts',
        name: 'name', phone: 'phone', email: 'email', website: 'website',
        address: 'address', main_category: 'main_category',
        assigned_to: 'assigned_to', tags: 'tags',
    };
    const setClauses: string[] = [];
    const values: any[] = [];
    let i = 1;
    const oldLead = await pool.query('SELECT status, call_attempts FROM leads WHERE id = $1', [req.params.id]);
    const isStatusChanging = req.body.status !== undefined && oldLead.rows[0] && req.body.status !== oldLead.rows[0].status;

    for (const [k, col] of Object.entries(allowedFields)) {
        if (req.body[k] !== undefined) {
            setClauses.push(`${col} = $${i++}`);
            values.push(req.body[k]);
        }
    }

    // Auto-update last_called and log activity if status changed manually
    if (isStatusChanging) {
        const userId = (req as any).user.id;
        if (req.body.last_called === undefined) {
            setClauses.push(`last_called = NOW()`);
            setClauses.push(`call_attempts = call_attempts + 1`);
            setClauses.push(`last_called_by = $${i++}`);
            values.push(userId);
        }
        // Log this interaction so it appears in charts and history
        await pool.query(
            'INSERT INTO call_logs (lead_id, user_id, duration, outcome, notes) VALUES ($1, $2, $3, $4, $5)',
            [req.params.id, userId, 0, req.body.status, `Status changed to ${req.body.status}`]
        );
    }

    if (setClauses.length === 0) return res.json({ message: 'Nothing to update' });
    values.push(req.params.id);
    await pool.query(`UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${i}`, values);
    res.json({ message: 'Lead updated' });
});

// Soft-delete lead (moves to archive)
app.delete('/api/leads/:id', authenticateToken, validateId, async (req, res) => {
    await pool.query('UPDATE leads SET is_archived = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead archived' });
});

// Archive endpoint
app.post('/api/leads/:id/archive', authenticateToken, validateId, async (req, res) => {
    await pool.query('UPDATE leads SET is_archived = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead archived' });
});

// Restore endpoint
app.post('/api/leads/:id/restore', authenticateToken, validateId, async (req, res) => {
    await pool.query('UPDATE leads SET is_archived = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead restored' });
});

// Permanently delete
app.delete('/api/leads/:id/permanent', authenticateToken, validateId, async (req, res) => {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead permanently deleted' });
});

// Duplicate check
app.get('/api/leads/duplicate-check', authenticateToken, async (req, res) => {
    const { phone, name } = req.query;
    const { rows } = await pool.query(
        `SELECT id, name, phone FROM leads WHERE (phone = $1 AND $1 != '') OR (LOWER(name) = LOWER($2) AND $2 != '') LIMIT 5`,
        [phone || '', name || '']
    );
    res.json({ duplicates: rows });
});

// ─── Call Log Routes ───────────────────────────────────────────────────────────
app.post('/api/calls', authenticateToken, async (req: any, res) => {
    const { lead_id, duration, outcome, notes } = req.body;
    const userId = req.user.id;
    await pool.query(
        `INSERT INTO call_logs (lead_id, user_id, duration, outcome, notes) VALUES ($1,$2,$3,$4,$5)`,
        [lead_id, userId, duration, outcome, notes]
    );
    await pool.query(
        `UPDATE leads SET last_called = NOW(), call_attempts = call_attempts + 1, last_called_by = $2 WHERE id = $1`,
        [lead_id, userId]
    );
    res.status(201).json({ message: 'Call logged' });
});

app.get('/api/leads/:id/calls', authenticateToken, validateId, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM call_logs WHERE lead_id = $1 ORDER BY timestamp DESC',
        [req.params.id]
    );
    res.json(rows);
});

// ─── Task Routes ─────────────────────────────────────────────────────────────
app.get('/api/leads/:id/tasks', authenticateToken, validateId, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM tasks WHERE lead_id = $1 ORDER BY scheduled_at ASC',
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching tasks' });
    }
});

app.post('/api/leads/:id/tasks', authenticateToken, validateId, async (req, res) => {
    try {
        const { scheduled_at, status = 'pending', type = 'call' } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO tasks (lead_id, scheduled_at, status, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.id, scheduled_at, status, type]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating task' });
    }
});

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    const [
        totalLeads, totalLeadsLastWeek, callsToday, callsLastWeek,
        interested, interestedLastWeek, converted, convertedLastWeek,
        newLeadsThisWeek, statusDist, callsPerDay, leadsPerDay, avgDur, outcomeDist
    ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM leads WHERE is_archived IS NOT TRUE'),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at < NOW() - INTERVAL '7 days' AND is_archived IS NOT TRUE`),
        pool.query(`SELECT COUNT(*) as count FROM call_logs WHERE DATE(timestamp) = CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) as count FROM call_logs WHERE DATE(timestamp) BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1`),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'interested' AND is_archived IS NOT TRUE`),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'interested' AND created_at < NOW() - INTERVAL '7 days' AND is_archived IS NOT TRUE`),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'converted' AND is_archived IS NOT TRUE`),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE status = 'converted' AND created_at < NOW() - INTERVAL '7 days' AND is_archived IS NOT TRUE`),
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days' AND is_archived IS NOT TRUE`),
        pool.query('SELECT status, COUNT(*) as count FROM leads WHERE is_archived IS NOT TRUE GROUP BY status'),
        pool.query(`SELECT DATE(timestamp) as date, COUNT(*) as count FROM call_logs GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 30`),
        pool.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM leads WHERE is_archived IS NOT TRUE GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`),
        pool.query('SELECT AVG(duration) as avg FROM call_logs'),
        pool.query('SELECT outcome, COUNT(*) as count FROM call_logs GROUP BY outcome'),
    ]);

    const computeTrend = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const total = parseInt(totalLeads.rows[0].count);
    const totalPrev = parseInt(totalLeadsLastWeek.rows[0].count);
    const calls = parseInt(callsToday.rows[0].count);
    const callsPrev = Math.round(parseInt(callsLastWeek.rows[0].count) / 7);
    const int_ = parseInt(interested.rows[0].count);
    const intPrev = parseInt(interestedLastWeek.rows[0].count);
    const conv = parseInt(converted.rows[0].count);
    const convPrev = parseInt(convertedLastWeek.rows[0].count);

    res.json({
        totalLeads: total,
        totalTrend: computeTrend(total, totalPrev),
        callsToday: calls,
        callsTrend: computeTrend(calls, callsPrev),
        interested: int_,
        interestedTrend: computeTrend(int_, intPrev),
        converted: conv,
        convertedTrend: computeTrend(conv, convPrev),
        newLeadsThisWeek: parseInt(newLeadsThisWeek.rows[0].count),
        conversionRate: total > 0 ? parseFloat(((conv / total) * 100).toFixed(1)) : 0,
        statusDistribution: statusDist.rows.map(r => ({ ...r, count: parseInt(r.count) })),
        callsPerDay: callsPerDay.rows.reverse().map(r => ({ ...r, count: parseInt(r.count) })),
        leadsPerDay: leadsPerDay.rows.reverse().map(r => ({ ...r, count: parseInt(r.count) })),
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
