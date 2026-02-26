const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseJsonPath = path.join(process.cwd(), 'data', 'database.json');
const envPath = path.join(process.cwd(), '.env');

// Check for .env file
let url = null;
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) url = match[1].trim();
}

if (!url) {
    if (fs.existsSync(databaseJsonPath)) {
        console.log('Using JSON DB');
        const db = JSON.parse(fs.readFileSync(databaseJsonPath, 'utf-8'));
        console.log('Employees:');
        db.employees?.forEach(e => {
            console.log(`ID: ${e.id} | Name: ${e.first_name} ${e.last_name} | Status: ${e.employment_status} | Branch: ${e.branch}`);
        });
        process.exit(0);
    }
    console.error('No DB found');
    process.exit(1);
}

const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT id, first_name, last_name, employment_status, branch FROM employees ORDER BY id')
    .then(res => {
        console.log('Employees from Postgres:');
        res.rows.forEach(e => {
            console.log(`ID: ${e.id} | Name: ${e.first_name} ${e.last_name} | Status: ${e.employment_status} | Branch: ${e.branch}`);
        });
        pool.end();
    })
    .catch(err => {
        console.error(err);
        pool.end();
    });
