const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function patchUsersTable() {
    try {
        console.log('⏳ Adding missing columns to users table...');

        // Add columns if they don't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE users ADD COLUMN email VARCHAR(100);
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column email already exists';
                END;
                
                BEGIN
                    ALTER TABLE users ADD COLUMN reset_otp VARCHAR(20);
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column reset_otp already exists';
                END;

                BEGIN
                    ALTER TABLE users ADD COLUMN reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
                EXCEPTION
                    WHEN duplicate_column THEN RAISE NOTICE 'column reset_otp_expires_at already exists';
                END;
            END $$;
        `);

        console.log('✅ Columns added successfully.');

        // Load local JSON to recover emails
        const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
        if (fs.existsSync(DB_FILE)) {
            const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            console.log('⏳ Updating existing users with emails from database.json...');

            for (const user of db.users) {
                if (user.email) {
                    await pool.query(
                        'UPDATE users SET email = $1 WHERE username = $2',
                        [user.email, user.username]
                    );
                    console.log(`   Updated email for ${user.username}`);
                }
            }
        }

        console.log('🚀 Patch complete!');

    } catch (err) {
        console.error('❌ Patch failed:', err);
    } finally {
        await pool.end();
    }
}

patchUsersTable();
