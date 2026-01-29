const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getDatabaseUrl() {
    // Try to read from .env file
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^DATABASE_URL=(.+)$/m);
            if (match) {
                return match[1].trim();
            }
        }
    } catch (e) {
        console.error('Error reading .env:', e);
    }
    return process.env.DATABASE_URL;
}

async function checkSize() {
    const connectionString = getDatabaseUrl();
    if (!connectionString) {
        console.log('No DATABASE_URL found. Checking local database.json...');
        checkLocalJson();
        return;
    }

    console.log('Connecting to PostgreSQL database...');
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Check Total DB Size
        const sizeRes = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
        console.log(`\n📦 Total Database Size: ${sizeRes.rows[0].size}`);

        // Check Table Sizes
        console.log('\n📊 Table Sizes:');
        const tablesRes = await pool.query(`
            SELECT
              relname as table_name,
              pg_size_pretty(pg_total_relation_size(relid)) as total_size
            FROM pg_catalog.pg_statio_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        `);

        if (tablesRes.rows.length === 0) {
            console.log('No tables found.');
        } else {
            console.table(tablesRes.rows);
        }

        // Row Counts
        console.log('\n🔢 Row Counts:');
        for (const row of tablesRes.rows) {
            if (row.table_name) {
                const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
                console.log(`${row.table_name}: ${countRes.rows[0].count} rows`);
            }
        }

    } catch (err) {
        console.error('❌ Database Error:', err.message);
    } finally {
        await pool.end();
    }
}

function checkLocalJson() {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`\n📄 Local database.json size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
        console.log('\n❌ No local database.json found.');
    }
}

checkSize();
