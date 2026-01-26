const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function patchDatabase() {
    // 1. Patch PostgreSQL if configured
    if (DATABASE_URL) {
        const pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        try {
            console.log('🔌 Connecting to PostgreSQL...');
            console.log('🛠️ Adding columns to users table...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS email TEXT,
                ADD COLUMN IF NOT EXISTS reset_otp TEXT,
                ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
            `);
            console.log('✅ PostgreSQL users table patched');
        } catch (error) {
            console.error('❌ PostgreSQL patch failed:', error);
        } finally {
            await pool.end();
        }
    }

    // 2. Patch Local JSON
    if (fs.existsSync(DB_FILE)) {
        try {
            console.log('📁 Patching local JSON database...');
            const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            if (db.users) {
                db.users = db.users.map(user => ({
                    ...user,
                    email: user.email || null,
                    reset_otp: user.reset_otp || null,
                    reset_otp_expires_at: user.reset_otp_expires_at || null
                }));
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
                console.log('✅ Local JSON database patched');
            }
        } catch (error) {
            console.error('❌ Local JSON patch failed:', error);
        }
    }
}

patchDatabase();
