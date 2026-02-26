const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(process.cwd(), '.env');
let url = null;
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) url = match[1].trim();
}

if (!url) {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
        const env = fs.readFileSync(envLocalPath, 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) url = match[1].trim();
    }
}

if (!url) {
    console.error('No DATABASE_URL found');
    process.exit(1);
}

const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'payslips';
`)
    .then(res => {
        console.log(JSON.stringify(res.rows, null, 2));
        pool.end();
    })
    .catch(err => {
        console.error(err);
        pool.end();
    });
