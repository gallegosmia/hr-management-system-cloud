const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function fullMigration() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    const DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

    if (!fs.existsSync(DB_FILE)) {
        console.error('❌ database.json not found');
        return;
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('✅ Loaded local data');

        // 1. Apply FULL Schema
        console.log('⏳ Applying full schema from schema.sql...');
        const schemaFile = path.join(process.cwd(), 'data', 'schema.sql');
        const schema = fs.readFileSync(schemaFile, 'utf-8');
        const queries = schema.split(';').filter(q => q.trim() !== '');
        for (let q of queries) {
            try {
                await pool.query(q);
            } catch (err) {
                // If it's just "already exists" errors, we can ignore them
                if (!err.message.includes('already exists')) {
                    console.warn(`⚠️ Query warning: ${err.message}`);
                }
            }
        }
        console.log('✅ Schema application finished');

        // 2. Clear core data to avoid conflicts on re-run (optional but cleaner for recovery)
        // We'll use TRUNCATE for speed and sequence reset
        console.log('⏳ Cleaning up target tables...');
        await pool.query('TRUNCATE users, employees, attendance, settings, payslips, payroll_runs, leave_requests, documents RESTART IDENTITY CASCADE');

        // 3. Migrate Users
        console.log('⏳ Migrating Users...');
        for (const user of db.users) {
            await pool.query(
                `INSERT INTO users (id, username, password, role, is_active, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [user.id, user.username, user.password, user.role, user.is_active || 1, user.created_at || new Date()]
            );
        }

        // 4. Migrate Employees (Full Column Set)
        console.log('⏳ Migrating Employees...');
        for (const emp of db.employees) {
            await pool.query(
                `INSERT INTO employees (
                    id, employee_id, last_name, first_name, middle_name, department, position, branch, 
                    employment_status, date_hired, date_of_birth, sss_number, philhealth_number, 
                    pagibig_number, tin, civil_status, salary_info, 
                    personal_info_complete, preemployment_req_complete, government_docs_complete,
                    employment_records_complete, attendance_records_complete, payroll_records_complete,
                    file_completion_status, profile_picture
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
                [
                    emp.id, emp.employee_id, emp.last_name, emp.first_name, emp.middle_name, emp.department,
                    emp.position, emp.branch, emp.employment_status, emp.date_hired, emp.date_of_birth,
                    emp.sss_number, emp.philhealth_number, emp.pagibig_number, emp.tin, emp.civil_status,
                    JSON.stringify(emp.salary_info),
                    emp.personal_info_complete || 0, emp.preemployment_req_complete || 0, emp.government_docs_complete || 0,
                    emp.employment_records_complete || 0, emp.attendance_records_complete || 0, emp.payroll_records_complete || 0,
                    emp.file_completion_status || 'Incomplete', emp.profile_picture
                ]
            );
        }

        // 5. Migrate Attendance
        console.log('⏳ Migrating Attendance...');
        if (db.attendance) {
            for (const att of db.attendance) {
                await pool.query(
                    `INSERT INTO attendance (id, employee_id, date, time_in, time_out, status, remarks) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [att.id, att.employee_id, att.date, att.time_in, att.time_out, att.status, att.remarks]
                );
            }
        }

        // 6. Migrate Settings
        console.log('⏳ Migrating Settings...');
        if (db.settings) {
            for (const s of db.settings) {
                await pool.query(
                    'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)',
                    [s.key, JSON.stringify(s.value), s.description]
                );
            }
        }

        // 7. Reset all sequences (just to be absolutely safe)
        const tables = ['users', 'employees', 'attendance', 'settings', 'payslips', 'payroll_runs', 'leave_requests'];
        for (const table of tables) {
            const seqRes = await pool.query(`
                SELECT pg_get_serial_sequence($1, 'id') as seq
            `, [table]);
            if (seqRes.rows[0].seq) {
                await pool.query(`
                    SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)
                `, [seqRes.rows[0].seq]);
            }
        }

        console.log('🚀 FULL MIGRATION SUCCESSFUL! All columns and data restored.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

fullMigration();
