
import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function backfill() {
  try {
    const { rows } = await pool.query("SELECT id, name, address FROM leads WHERE city IS NULL OR city = ''");
    console.log(`Checking ${rows.length} leads...`);
    
    let updatedCount = 0;
    
    for (const lead of rows) {
      if (!lead.address || !lead.address.includes(',')) continue;
      
      const parts = lead.address.split(',').map(p => p.trim());
      let cityCandidate = null;
      
      // Typical Google Maps address: [..., City, State Zip, Country]
      // Sample: "Ballygunge Park, Ballygunge, Kolkata, West Bengal 700019, India"
      // Parts: ["Ballygunge Park", "Ballygunge", "Kolkata", "West Bengal 700019", "India"]
      
      if (parts.length >= 3) {
        // If last is India/Country, check the two before it
        const last = parts[parts.length - 1].toLowerCase();
        if (last === 'india' || last.length < 3) {
           // parts[length-2] is likely "State Zip" or "State"
           // parts[length-3] is likely City
           cityCandidate = parts[parts.length - 3];
        } else {
           // parts[length-1] is likely Country or State
           // parts[length-2] is likely City
           cityCandidate = parts[parts.length - 2];
        }
      } else if (parts.length === 2) {
        cityCandidate = parts[0];
      }
      
      if (cityCandidate) {
        // Clean up candidate (remove numbers if any)
        cityCandidate = cityCandidate.replace(/\d+/g, '').trim();
        
        if (cityCandidate.length > 2) {
           await pool.query("UPDATE leads SET city = $1 WHERE id = $2", [cityCandidate, lead.id]);
           updatedCount++;
        }
      }
    }
    
    console.log(`Successfully backfilled city for ${updatedCount} leads.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

backfill();
