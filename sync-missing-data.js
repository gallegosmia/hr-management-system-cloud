const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const NEON_URL = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

async function sync() {
    console.log('📂 Loading local database.json...');
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    
    const client = await pool.connect();
    try {
        console.log('\n🔄 Syncing Missing Cloud Tables...');

        // 1. Sync Employee Loans (Ledger)
        if (db.emp_loans?.length > 0) {
            console.log(`Syncing ${db.emp_loans.length} employee loans...`);
            await client.query("DELETE FROM employee_loans");
            for (const l of db.emp_loans) {
                await client.query(
                    `INSERT INTO employee_loans (id, employee_id, loan_type, principal, balance, amortization, status, start_date, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [l.id, l.employee_id, l.loan_type, l.principal||0, l.balance||0, l.amortization||0, l.status, l.start_date, l.created_at]
                ).catch(e => console.warn(`  ID ${l.id}: ${e.message}`));
            }
            await client.query(`SELECT setval('employee_loans_id_seq', (SELECT MAX(id) FROM employee_loans))`).catch(()=>{});
        }

        // 2. Sync Emergency Loans (Requests)
        if (db.emerg_loans?.length > 0) {
            console.log(`Syncing ${db.emerg_loans.length} emergency loan requests...`);
            await client.query("DELETE FROM emergency_loans");
            for (const l of db.emerg_loans) {
                await client.query(
                    `INSERT INTO emergency_loans (id, employee_id, requested_amount, approved_amount, reason, category, status, filing_date, approvals, metadata, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                    [
                        l.id, l.employee_id, l.requested_amount, l.approved_amount||null, 
                        l.reason, l.category, l.status, l.filing_date, 
                        JSON.stringify(l.approvals||[]), JSON.stringify(l.metadata||{}), 
                        l.created_at
                    ]
                ).catch(e => console.warn(`  ID ${l.id}: ${e.message}`));
            }
            await client.query(`SELECT setval('emergency_loans_id_seq', (SELECT MAX(id) FROM emergency_loans))`).catch(()=>{});
        }

        // 3. Sync Announcements
        if (db.announcements?.length > 0) {
            console.log(`Syncing ${db.announcements.length} announcements...`);
            await client.query("DELETE FROM announcements");
            for (const a of db.announcements) {
                await client.query(
                    `INSERT INTO announcements (id, title, content, category, priority, target_branch, target_employee_id, is_active, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [a.id, a.title, a.content, a.category, a.priority, a.target_branch, a.target_employee_id||null, a.is_active !== false, a.created_at]
                ).catch(e => console.warn(`  ID ${a.id}: ${e.message}`));
            }
            await client.query(`SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements))`).catch(()=>{});
        }

        // 4. Sync User Notifications
        if (db.user_notifications?.length > 0) {
            console.log(`Syncing ${db.user_notifications.length} notifications...`);
            await client.query("DELETE FROM user_notifications");
            for (const n of db.user_notifications) {
                await client.query(
                    `INSERT INTO user_notifications (id, user_id, title, message, type, is_read, link, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [n.id, n.user_id, n.title, n.message, n.type||'system', n.is_read?1:0, n.link, n.created_at]
                ).catch(e => console.warn(`  ID ${n.id}: ${e.message}`));
            }
            await client.query(`SELECT setval('user_notifications_id_seq', (SELECT MAX(id) FROM user_notifications))`).catch(()=>{});
        }

        console.log('\n🎉 ===== DATA SYNC COMPLETE =====');
    } finally {
        client.release();
        await pool.end();
    }
}

sync().catch(e => console.error(e.message));
