const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('🚀 Starting 4-Checkpoint Attendance Migration...\n');

    try {
        // Add new checkpoint columns
        console.log('📋 Adding checkpoint columns...');

        const columns = [
            // 4 Checkpoints
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_in TIME",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_out TIME",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_in TIME",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_out TIME",

            // Device tracking
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_in_device VARCHAR(50)",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_out_device VARCHAR(50)",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_in_device VARCHAR(50)",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_out_device VARCHAR(50)",

            // Method tracking
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_in_method VARCHAR(50) DEFAULT 'QR Scan'",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_out_method VARCHAR(50) DEFAULT 'QR Scan'",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_in_method VARCHAR(50) DEFAULT 'QR Scan'",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_out_method VARCHAR(50) DEFAULT 'QR Scan'",

            // Computed hours
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS morning_hours DECIMAL(5,2) DEFAULT 0",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS afternoon_hours DECIMAL(5,2) DEFAULT 0",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2) DEFAULT 0",

            // Device type (legacy support)
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_type VARCHAR(50)",

            // Payroll lock
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS locked_by INTEGER",
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE",

            // Updated timestamp
            "ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
        ];

        for (const sql of columns) {
            try {
                await pool.query(sql);
                console.log(`  ✅ ${sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0] || 'OK'}`);
            } catch (err) {
                console.log(`  ⚠️ Column may already exist: ${err.message}`);
            }
        }

        // Migrate existing data: copy time_in to morning_in if morning_in is null
        console.log('\n📊 Migrating existing attendance data...');
        await pool.query(`
            UPDATE attendance 
            SET morning_in = time_in, 
                morning_out = time_out,
                morning_in_device = device_type,
                morning_out_device = device_type
            WHERE morning_in IS NULL AND time_in IS NOT NULL
        `);
        console.log('  ✅ Existing time_in/time_out migrated to morning checkpoints');

        console.log('\n🎉 Migration complete!');
        console.log('\n📌 New Attendance Flow:');
        console.log('   1. Morning Check-In');
        console.log('   2. Morning Check-Out');
        console.log('   3. Afternoon Check-In');
        console.log('   4. Afternoon Check-Out');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

migrate();
