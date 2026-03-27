const { Pool } = require('pg');
const fs = require('fs');

const NEON = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pool = new Pool({ connectionString: NEON, ssl: { rejectUnauthorized: false } });
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf-8'));

async function run() {
    const client = await pool.connect();
    try {
        // Add missing columns
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branch VARCHAR(100)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS hr_approval_status VARCHAR(50)');
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE'");
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(20)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP WITH TIME ZONE');
        console.log('✅ Columns added/verified.');

        // Clear sessions and users
        await client.query('DELETE FROM sessions');
        await client.query('DELETE FROM users');
        console.log('🧹 Cleared existing users.');

        let count = 0;
        for (const u of db.users) {
            try {
                await client.query(
                    `INSERT INTO users (id, username, password, role, email, employee_id, is_active, assigned_branch, status, created_at, last_login)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        u.id,
                        u.username,
                        u.password,
                        u.role,
                        u.email || null,
                        u.employee_id || null,
                        u.is_active !== undefined ? u.is_active : 1,
                        u.assigned_branch || null,
                        u.status || 'ACTIVE',
                        u.created_at || new Date(),
                        u.last_login || null
                    ]
                );
                count++;
                console.log(`  ✅ ${u.username} (${u.role})`);
            } catch (e) {
                console.warn(`  ❌ ${u.username}: ${e.message}`);
            }
        }

        await client.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

        const res = await client.query('SELECT COUNT(*) as total FROM users');
        console.log(`\n🎉 Done! ${res.rows[0].total} users now in Neon cloud.`);

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(console.error);
