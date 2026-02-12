/**
 * Payroll Migration Runner
 * Executes the payroll database migration script
 * Run: node migrations/run-payroll-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting payroll module migration...\n');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'payroll_migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        console.log('📋 Executing migration script...');

        // Execute migration
        await client.query(migrationSQL);

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Verifying new tables...');

        // Verify tables
        const result = await client.query(`
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = t.table_name) AS column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            AND table_name IN ('payroll_runs', 'payslips', 'payroll_audit_log')
            ORDER BY table_name
        `);

        console.log('\nCreated tables:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name} (${row.column_count} columns)`);
        });

        console.log('\n🎉 Payroll module is ready to use!');

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runMigration();
