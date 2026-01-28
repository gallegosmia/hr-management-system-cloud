const { query } = require('./lib/database');

async function migrate() {
    try {
        console.log('Migrating database...');
        await query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);');
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
