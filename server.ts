import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("crm.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    is_temporarily_closed INTEGER,
    status TEXT DEFAULT 'not_called',
    notes TEXT,
    last_called TEXT,
    next_followup TEXT,
    call_attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    duration INTEGER, -- in seconds
    outcome TEXT,
    notes TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
`);

// --- Seed Data ---
const seedDatabase = () => {
  const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get() as any;
  if (leadCount.count > 0) return;

  console.log("Seeding demo data...");

  const demoLeads = [
    {
      place_id: "p1", name: "Skyline Architecture", phone: "+1 555-0101", website: "https://skyline-arch.com",
      rating: 4.8, reviews: 1250, description: "Leading architecture firm specializing in sustainable urban design.",
      address: "450 Market St, San Francisco, CA", lat: 37.7897, lng: -122.3998,
      main_category: "Architect", categories: "Architect, Urban Planner", workday_timing: "9am–6pm", status: "interested"
    },
    {
      place_id: "p2", name: "Green Leaf Landscaping", phone: "+1 555-0102", website: "https://greenleaf.io",
      rating: 4.5, reviews: 850, description: "Premium residential and commercial landscaping services.",
      address: "1200 Valencia St, San Francisco, CA", lat: 37.7523, lng: -122.4215,
      main_category: "Landscaper", categories: "Landscaper, Garden Center", workday_timing: "8am–5pm", status: "follow_up"
    },
    {
      place_id: "p3", name: "TechNova Solutions", phone: "+1 555-0103", website: "https://technova.net",
      rating: 4.9, reviews: 3200, description: "Innovative software development and cloud consulting.",
      address: "101 California St, San Francisco, CA", lat: 37.7932, lng: -122.3995,
      main_category: "IT Services", categories: "Software Company, IT Consultant", workday_timing: "10am–7pm", status: "converted"
    },
    {
      place_id: "p4", name: "Blue Harbor Logistics", phone: "+1 555-0104", website: "https://blueharbor.com",
      rating: 4.2, reviews: 450, description: "Global shipping and supply chain management experts.",
      address: "Pier 39, San Francisco, CA", lat: 37.8086, lng: -122.4098,
      main_category: "Logistics", categories: "Freight Forwarder, Warehouse", workday_timing: "24/7", status: "not_called"
    },
    {
      place_id: "p5", name: "Golden Gate Bakery", phone: "+1 555-0105", website: "https://ggbakery.com",
      rating: 4.7, reviews: 5600, description: "Famous local bakery known for sourdough and pastries.",
      address: "1029 Grant Ave, San Francisco, CA", lat: 37.7963, lng: -122.4068,
      main_category: "Bakery", categories: "Bakery, Cafe", workday_timing: "7am–4pm", status: "not_interested"
    },
    {
      place_id: "p6", name: "Summit Law Group", phone: "+1 555-0106", website: "https://summitlaw.com",
      rating: 4.6, reviews: 210, description: "Specializing in corporate law and intellectual property.",
      address: "555 California St, San Francisco, CA", lat: 37.7922, lng: -122.4038,
      main_category: "Law Firm", categories: "Lawyer, Legal Services", workday_timing: "9am–5pm", status: "interested"
    },
    {
      place_id: "p7", name: "Urban Fitness Hub", phone: "+1 555-0107", website: "https://urbanfitness.fit",
      rating: 4.4, reviews: 1100, description: "Modern gym with state-of-the-art equipment and personal training.",
      address: "200 Brannan St, San Francisco, CA", lat: 37.7832, lng: -122.3915,
      main_category: "Gym", categories: "Fitness Center, Personal Trainer", workday_timing: "5am–11pm", status: "follow_up"
    },
    {
      place_id: "p8", name: "Pacific Dental Care", phone: "+1 555-0108", website: "https://pacificdental.com",
      rating: 4.8, reviews: 940, description: "Comprehensive family and cosmetic dentistry.",
      address: "2100 Webster St, San Francisco, CA", lat: 37.7895, lng: -122.4325,
      main_category: "Dentist", categories: "Dentist, Dental Clinic", workday_timing: "8am–6pm", status: "not_called"
    }
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (
      place_id, name, phone, website, rating, reviews, description, address, 
      latitude, longitude, main_category, categories, workday_timing, status, last_called
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCall = db.prepare(`
    INSERT INTO call_logs (lead_id, duration, outcome, notes, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = new Date();
  
  demoLeads.forEach((lead, index) => {
    const lastCalledDate = new Date();
    lastCalledDate.setDate(now.getDate() - (index % 5)); // Spread calls over last 5 days
    
    const result = insertLead.run(
      lead.place_id, lead.name, lead.phone, lead.website, lead.rating, lead.reviews, 
      lead.description, lead.address, lead.lat, lead.lng, lead.main_category, 
      lead.categories, lead.workday_timing, lead.status, 
      lead.status !== 'not_called' ? lastCalledDate.toISOString() : null
    );

    const leadId = result.lastInsertRowid;

    if (lead.status !== 'not_called') {
      // Add some call logs for each called lead
      const callCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < callCount; i++) {
        const callDate = new Date(lastCalledDate);
        callDate.setHours(callDate.getHours() - (i * 2));
        
        insertCall.run(
          leadId,
          Math.floor(Math.random() * 300) + 30, // 30s to 5m 30s
          i === callCount - 1 ? lead.status : 'called_no_response',
          `Demo call log entry ${i + 1}`,
          callDate.toISOString()
        );
      }
    }
  });

  console.log("Demo data seeded successfully.");
};

seedDatabase();

const app = express();
app.use(express.json());

// Auth Middleware (Disabled for demo)
const authenticateToken = (req: any, res: any, next: any) => {
  req.user = { id: 1, email: 'demo@leadflow.com' };
  next();
};

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    stmt.run(email, hashedPassword);
    res.status(201).json({ message: "User created" });
  } catch (error) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// --- Lead Routes ---
app.get("/api/leads", authenticateToken, (req, res) => {
  const { status, search, page = 1, limit = 20, sort = 'id', order = 'DESC' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = "SELECT * FROM leads WHERE 1=1";
  const params: any[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  if (search) {
    query += " AND (name LIKE ? OR phone LIKE ? OR main_category LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Count total for pagination
  const total: any = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params);

  query += ` ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const leads = db.prepare(query).all(...params);
  res.json({ leads, total: total.count, page: Number(page), limit: Number(limit) });
});

app.post("/api/leads/import", authenticateToken, (req, res) => {
  const leads = req.body;
  if (!Array.isArray(leads)) return res.status(400).json({ error: "Invalid data format" });

  const insert = db.prepare(`
    INSERT OR IGNORE INTO leads (
      place_id, name, description, phone, website, rating, reviews, address, 
      latitude, longitude, main_category, categories, workday_timing, is_temporarily_closed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data) => {
    for (const lead of data) {
      insert.run(
        lead.place_id,
        lead.name,
        lead.description,
        lead.phone,
        lead.website,
        lead.rating,
        lead.reviews,
        lead.address,
        lead.location?.lat,
        lead.location?.lng,
        lead.main_category,
        lead.categories,
        lead.workday_timing,
        lead.is_temporarily_closed ? 1 : 0
      );
    }
  });

  transaction(leads);
  res.json({ message: "Import successful" });
});

app.get("/api/leads/:id", authenticateToken, (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  res.json(lead);
});

app.put("/api/leads/:id", authenticateToken, (req, res) => {
  const { status, notes, last_called, next_followup, call_attempts } = req.body;
  const stmt = db.prepare(`
    UPDATE leads SET 
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      last_called = COALESCE(?, last_called),
      next_followup = COALESCE(?, next_followup),
      call_attempts = COALESCE(?, call_attempts)
    WHERE id = ?
  `);
  stmt.run(status, notes, last_called, next_followup, call_attempts, req.params.id);
  res.json({ message: "Lead updated" });
});

app.delete("/api/leads/:id", authenticateToken, (req, res) => {
  db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  res.json({ message: "Lead deleted" });
});

// --- Call Log Routes ---
app.post("/api/calls", authenticateToken, (req, res) => {
  const { lead_id, duration, outcome, notes } = req.body;
  const stmt = db.prepare(`
    INSERT INTO call_logs (lead_id, duration, outcome, notes)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(lead_id, duration, outcome, notes);

  // Update lead's last_called and call_attempts
  db.prepare(`
    UPDATE leads SET 
      last_called = CURRENT_TIMESTAMP,
      call_attempts = call_attempts + 1
    WHERE id = ?
  `).run(lead_id);

  res.status(201).json({ message: "Call logged" });
});

app.get("/api/leads/:id/calls", authenticateToken, (req, res) => {
  const calls = db.prepare("SELECT * FROM call_logs WHERE lead_id = ? ORDER BY timestamp DESC").all(req.params.id);
  res.json(calls);
});

// --- Dashboard Stats ---
app.get("/api/dashboard/stats", authenticateToken, (req, res) => {
  const totalLeads: any = db.prepare("SELECT COUNT(*) as count FROM leads").get();
  const callsToday: any = db.prepare("SELECT COUNT(*) as count FROM leads WHERE DATE(last_called) = DATE('now')").get();
  const interested: any = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'interested'").get();
  const converted: any = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").get();
  
  const statusDistribution = db.prepare("SELECT status, COUNT(*) as count FROM leads GROUP BY status").all();
  
  // Calls per day (last 7 days)
  const callsPerDay = db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(*) as count 
    FROM call_logs 
    GROUP BY DATE(timestamp) 
    ORDER BY date DESC 
    LIMIT 7
  `).all();

  const avgDuration: any = db.prepare("SELECT AVG(duration) as avg FROM call_logs").get();
  const outcomeDistribution = db.prepare("SELECT outcome, COUNT(*) as count FROM call_logs GROUP BY outcome").all();

  res.json({
    totalLeads: totalLeads.count,
    callsToday: callsToday.count,
    interested: interested.count,
    converted: converted.count,
    statusDistribution,
    callsPerDay: callsPerDay.reverse(),
    avgDuration: Math.round(avgDuration.avg || 0),
    outcomeDistribution
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
