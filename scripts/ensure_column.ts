
import { query } from '../lib/database';

async function migrate() {
    console.log('Starting migration...');
    try {
        await query(`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS other_deductions_breakdown JSONB;`);
        console.log('Migration successful: Added other_deductions_breakdown column.');
    } catch (e: any) {
        console.error('Migration failed:', e.message);
    }
}

migrate();
