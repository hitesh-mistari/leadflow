
import pkg from 'pg';
import 'dotenv/config';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function create() {
  const users = [
    { email: 'hassan2026@leadflow.com', password: 'hassan@2026', name: 'Hassan' },
    { email: 'vaishnavi0508@leadflow.com', password: 'vaishnavi@0508', name: 'Vaishnavi' },
    { email: 'hitesh2402@leadflow.com', password: 'hitesh@2402', name: 'Hitesh' }
  ];

  try {
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await pool.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
        [user.name, user.email, hashedPassword]
      );
      console.log(`User created: ${user.email}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

create();
