const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env file');
    console.log('Please update your .env file with your local PostgreSQL connection:');
    console.log('DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hr_management');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrateData() {
    console.log('🚀 Starting JSON to PostgreSQL migration...\n');

    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection successful!\n');

        // Read JSON database
        const jsonDbPath = path.join(process.cwd(), 'data', 'database.json');

        if (!fs.existsSync(jsonDbPath)) {
            console.log('⚠️  No database.json file found. Nothing to migrate.');
            return;
        }

        const jsonData = JSON.parse(fs.readFileSync(jsonDbPath, 'utf-8'));
        console.log('📄 JSON database loaded successfully!\n');

        // Migration order (respecting foreign key constraints)
        const migrationOrder = [
            'users',
            'employees',
            'education',
            'documents',
            'attendance',
            'leave_requests',
            'payroll_runs',
            'payslips',
            'settings',
            'sessions',
            'admin_approval_queue',
            'announcements',
            'audit_logs'
        ];

        let totalRecords = 0;

        for (const table of migrationOrder) {
            const records = jsonData[table] || [];

            if (records.length === 0) {
                console.log(`⏭️  Skipping ${table} (no records)`);
                continue;
            }

            console.log(`📊 Migrating ${table}... (${records.length} records)`);

            let migrated = 0;
            for (const record of records) {
                try {
                    const keys = Object.keys(record);
                    const values = Object.values(record);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                    const sql = `
                        INSERT INTO ${table} (${keys.join(', ')})
                        VALUES (${placeholders})
                        ON CONFLICT (id) DO UPDATE SET
                        ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}
                    `;

                    await pool.query(sql, values);
                    migrated++;
                } catch (err) {
                    console.error(`   ⚠️  Error migrating record in ${table}:`, err.message);
                }
            }

            console.log(`   ✅ Migrated ${migrated}/${records.length} records\n`);
            totalRecords += migrated;

            // Reset sequence for tables with auto-increment IDs
            try {
                await pool.query(`
                    SELECT setval(
                        pg_get_serial_sequence('${table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
                        false
                    )
                `);
            } catch (err) {
                // Some tables might not have sequences, that's okay
            }
        }

        console.log(`\n🎉 Migration complete!`);
        console.log(`📊 Total records migrated: ${totalRecords}`);
        console.log(`\n💡 Your JSON database is still intact at: ${jsonDbPath}`);
        console.log(`   You can keep it as a backup or delete it if everything works fine.\n`);

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

migrateData();
