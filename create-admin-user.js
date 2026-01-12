const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
    const username = 'Mel';
    const password = 'admin123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        // Fix the sequence first
        await pool.query("SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id)+1, 1), false) FROM users;");
        console.log('✅ Sequence reset');

        await pool.query(
            `INSERT INTO users (username, password, role, is_active, created_at) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (username) DO UPDATE 
             SET password = $2, role = $3, is_active = $4`,
            [username, hashedPassword, 'Admin', 1, new Date()]
        );
        console.log(`✅ User '${username}' created/updated successfully with password '${password}'`);
    } catch (error) {
        console.error('❌ Error creating user:', error);
    } finally {
        await pool.end();
    }
}

createAdminUser();
