import { query } from '../lib/database';

async function main() {
    try {
        console.log('Checking notifications table columns...');

        // Add columns one by one; PostgreSQL ADD COLUMN IF NOT EXISTS works in v9.6+.
        // Our target DB is Neon (Postgres 14+), so let's try safely:

        const sqlAddType = `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);`;
        const sqlAddSeverity = `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(20);`;
        const sqlAddRefId = `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);`;
        const sqlAddRefType = `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);`;

        await query(sqlAddType);
        console.log('Added / confirmed "type" column.');

        await query(sqlAddSeverity);
        console.log('Added / confirmed "severity" column.');

        await query(sqlAddRefId);
        console.log('Added / confirmed "reference_id" column.');

        await query(sqlAddRefType);
        console.log('Added / confirmed "reference_type" column.');

        console.log('Successfully updated notifications table schema.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

main();
