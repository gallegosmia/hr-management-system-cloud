const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkUser() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const query = "SELECT username, email FROM users WHERE username = $1 OR email = $1";
        const val = 'relobamarilyn81.mlic@gmail.com';
        const res = await pool.query(query, [val]);

        console.log(`Searching for: ${val}`);
        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User not found in database.');

            // Let's see some samples of what IS in the database
            const samples = await pool.query("SELECT username, email FROM users LIMIT 5");
            console.log('Sample users in DB:');
            console.table(samples.rows);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkUser();
