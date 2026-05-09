const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// We use the exact Neon DB URL as it is the active production one for this workspace
const NEON_URL = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function restoreAttendance() {
    console.log('📂 Loading local database.json...');
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const allAttendance = db.attendance || [];
    
    // The exact dates the user reported missing
    const targetDates = ['2026-03-28', '2026-03-30', '2026-03-31'];
    
    const missingRecords = allAttendance.filter(r => r.date && targetDates.some(d => r.date.includes(d)));
    console.log(`\n🔍 Found ${missingRecords.length} records in local JSON for missing dates (28th, 30th, 31st).`);
    
    if (missingRecords.length === 0) {
        console.log("❌ No records found to restore from JSON.");
        process.exit(0);
    }
    
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to Cloud Database and Restoring...');
        let restoredCount = 0;
        let updatedCount = 0;

        for (const record of missingRecords) {
            // Check if record exists
            const existing = await client.query('SELECT id FROM attendance WHERE employee_id = $1 AND date = $2', [record.employee_id, record.date]);
            
            if (existing.rows.length === 0) {
                // Insert Missing Record
                await client.query(
                    `INSERT INTO attendance (employee_id, date, time_in, time_out, morning_in, morning_out, afternoon_in, afternoon_out, total_hours, status, remarks)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        record.employee_id, record.date, record.time_in, record.time_out,
                        record.morning_in, record.morning_out, record.afternoon_in, record.afternoon_out,
                        record.total_hours || 0, record.status || 'Present', record.remarks
                    ]
                );
                restoredCount++;
            } else {
                // Update it just in case it exists but was empty/wiped
                await client.query(
                    `UPDATE attendance SET 
                     time_in = $3, time_out = $4, morning_in = $5, morning_out = $6, afternoon_in = $7, afternoon_out = $8,
                     total_hours = $9, status = $10, remarks = $11
                     WHERE employee_id = $1 AND date = $2`,
                    [
                        record.employee_id, record.date, record.time_in, record.time_out,
                        record.morning_in, record.morning_out, record.afternoon_in, record.afternoon_out,
                        record.total_hours || 0, record.status || 'Present', record.remarks
                    ]
                );
                updatedCount++;
            }
        }
        
        console.log(`\n🎉 ===== DATA RESTORE COMPLETE =====`);
        console.log(`✅ Successfully INSERTED ${restoredCount} entirely missing attendance records.`);
        console.log(`✅ Successfully UPDATED ${updatedCount} existing but potentially blank records.`);
        
    } catch (e) {
        console.error("❌ Error restoring data:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

restoreAttendance().catch(e => console.error(e.message));
