const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const NEON_URL = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function sync() {
    const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
    
    try {
        console.log('📂 Loading local database.json...');
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        const attendance = db.attendance || [];
        
        console.log(`Check for March 24-26 records in local JSON...`);
        const targetRecords = attendance.filter(r => 
            r.date && (r.date === '2026-03-24' || r.date === '2026-03-25' || r.date === '2026-03-26')
        );
        
        console.log(`Found ${targetRecords.length} records to sync.`);
        
        const client = await pool.connect();
        try {
            console.log('🔄 Syncing records to Neon (ignoring local IDs to avoid conflicts)...');
            let syncedCount = 0;
            let skippedCount = 0;
            
            for (const r of targetRecords) {
                // Check if already exists based on employee_id and date
                const check = await client.query(
                    "SELECT id FROM attendance WHERE employee_id = $1 AND date = $2", 
                    [r.employee_id, r.date]
                );
                
                if (check.rows.length > 0) {
                    skippedCount++;
                    continue;
                }
                
                await client.query(
                    `INSERT INTO attendance (
                        employee_id, date, status, remarks, 
                        time_in, time_out, morning_in, morning_out, 
                        afternoon_in, afternoon_out
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        r.employee_id, r.date, r.status, r.remarks || null,
                        r.time_in || null, r.time_out || null, 
                        r.morning_in || null, r.morning_out || null,
                        r.afternoon_in || null, r.afternoon_out || null
                    ]
                );
                syncedCount++;
            }
            
            console.log(`✅ Sync complete: ${syncedCount} records added, ${skippedCount} already existed.`);

        } finally {
            client.release();
        }
    } catch (e) {
        console.error('❌ Sync failed:', e.message);
    } finally {
        await pool.end();
    }
}

sync();
