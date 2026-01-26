const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_QoJAXGF4wj9C@ep-dawn-sea-a1nhcz1w-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkMia() {
    try {
        console.log('Checking user mia...');
        const res = await pool.query("SELECT * FROM users WHERE username = 'mia'");
        console.log('User Record:', res.rows[0]);

        console.log('Checking for email match...');
        const emailRes = await pool.query("SELECT * FROM users WHERE email = 'gmia0519@gmail.com'");
        console.log('By Email Record:', emailRes.rows[0]);

        console.log('Checking table structure...');
        const cols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('Columns:', cols.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await pool.end();
    }
}

checkMia();
