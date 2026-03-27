import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function test() {
    let url = null;
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
        const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) url = match[1].trim();
    }

    if (!url) {
        console.log('No DB URL');
        return;
    }

    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pool.query(`
                INSERT INTO audit_logs(user_id, action, details, created_at)
                VALUES($1, $2, $3, CURRENT_TIMESTAMP)
            `, [1, 'DELETE_PAYROLL', '{}']);
        console.log('Audit log insert successful');
    } catch (e: any) {
        console.log('Audit log insert error:', e.message);
    }
    
    try {
        const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'`);
        console.log('audit_logs columns:', res.rows);
    } catch (e: any) {
        console.log('Schema check error:', e.message);
    }

    pool.end();
}

test();
