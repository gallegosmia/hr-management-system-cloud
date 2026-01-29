const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function completeMigration() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    // Use the URL directly to ensure we are targeting the new DB
    const DATABASE_URL = 'postgresql://neondb_owner:npg_PslbEZF85iOH@ep-cold-dew-a1pzda3q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

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
        if (fs.existsSync(schemaFile)) {
            const schema = fs.readFileSync(schemaFile, 'utf-8');
            const queries = schema.split(';').filter(q => q.trim() !== '');
            for (let q of queries) {
                try {
                    await pool.query(q);
                } catch (err) {
                    if (!err.message.includes('already exists')) {
                        console.warn(`⚠️ Query warning: ${err.message}`);
                    }
                }
            }
            console.log('✅ Schema application finished');
        } else {
            console.error('❌ schema.sql not found! Tables might not exist.');
        }

        // 2. Clear target tables
        console.log('⏳ Cleaning up target tables...');
        try {
            await pool.query('TRUNCATE users, employees, attendance, settings, payslips, payroll_runs, leave_requests, documents, audit_logs, education RESTART IDENTITY CASCADE');
        } catch (e) {
            console.log('Info: TRUNCATE failed (tables might not exist yet), proceeding to inserts.');
        }

        // 3. Migrate Users
        console.log(`⏳ Migrating ${db.users?.length || 0} Users...`);
        if (db.users) {
            for (const user of db.users) {
                await pool.query(
                    `INSERT INTO users (id, username, password, role, is_active, created_at, employee_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (username) DO NOTHING`,
                    [user.id, user.username, user.password, user.role, user.is_active || 1, user.created_at || new Date(), user.employee_id]
                );
            }
        }

        // 4. Migrate Employees
        console.log(`⏳ Migrating ${db.employees?.length || 0} Employees...`);
        if (db.employees) {
            for (const emp of db.employees) {
                await pool.query(
                    `INSERT INTO employees (
                        id, employee_id, last_name, first_name, middle_name, department, position, branch, 
                        employment_status, date_hired, date_of_birth, sss_number, philhealth_number, 
                        pagibig_number, tin, civil_status, salary_info, 
                        personal_info_complete, preemployment_req_complete, government_docs_complete,
                        employment_records_complete, attendance_records_complete, payroll_records_complete,
                        file_completion_status, profile_picture
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
                    ON CONFLICT(employee_id) DO NOTHING`,
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
        }

        // 5. Migrate Attendance
        console.log(`⏳ Migrating ${db.attendance?.length || 0} Attendance Records...`);
        if (db.attendance) {
            for (const att of db.attendance) {
                try {
                    await pool.query(
                        `INSERT INTO attendance (
                        id, employee_id, date, time_in, time_out, 
                        morning_in, morning_out, afternoon_in, afternoon_out,
                        total_hours, status, remarks, is_locked
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                        [
                            att.id, att.employee_id, att.date, att.time_in, att.time_out,
                            att.morning_in, att.morning_out, att.afternoon_in, att.afternoon_out,
                            att.total_hours, att.status, att.remarks, att.is_locked
                        ]
                    );
                } catch (e) { console.error(`Failed attendance id ${att.id}:`, e.message); }
            }
        }

        // 6. Migrate Leave Requests
        console.log(`⏳ Migrating ${db.leave_requests?.length || 0} Leave Requests...`);
        if (db.leave_requests) {
            for (const lr of db.leave_requests) {
                try {
                    await pool.query(
                        `INSERT INTO leave_requests (
                        id, employee_id, leave_type, start_date, end_date, days_count, 
                        reason, status, approvals, remarks, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                        [
                            lr.id, lr.employee_id, lr.leave_type, lr.start_date, lr.end_date, lr.days_count,
                            lr.reason, lr.status, JSON.stringify(lr.approvals || []), lr.remarks, lr.created_at
                        ]
                    );
                } catch (e) { console.error(`Failed leave_request id ${lr.id}:`, e.message); }
            }
        }

        // 7. Migrate Payroll Runs
        console.log(`⏳ Migrating ${db.payroll_runs?.length || 0} Payroll Runs...`);
        if (db.payroll_runs) {
            for (const pr of db.payroll_runs) {
                await pool.query(
                    `INSERT INTO payroll_runs (id, period_start, period_end, total_amount, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [pr.id, pr.period_start, pr.period_end, pr.total_amount, pr.status, pr.created_at]
                );
            }
        }

        // 8. Migrate Payslips
        console.log(`⏳ Migrating ${db.payslips?.length || 0} Payslips...`);
        if (db.payslips) {
            for (const ps of db.payslips) {
                await pool.query(
                    `INSERT INTO payslips (
                        id, payroll_run_id, employee_id, gross_pay, net_pay, 
                        total_deductions, total_allowances, days_present, deduction_details, allowance_details
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        ps.id, ps.payroll_run_id, ps.employee_id, ps.gross_pay, ps.net_pay,
                        ps.total_deductions, ps.total_allowances, ps.days_present,
                        JSON.stringify(ps.deduction_details || {}), JSON.stringify(ps.allowance_details || {})
                    ]
                );
            }
        }

        // 9. Migrate Settings
        console.log(`⏳ Migrating ${db.settings?.length || 0} Settings...`);
        if (db.settings) {
            for (const s of db.settings) {
                await pool.query(
                    'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
                    [s.key, JSON.stringify(s.value), s.description]
                );
            }
        }

        // 10. Migrate Documents
        console.log(`⏳ Migrating ${db.documents?.length || 0} Documents...`);
        if (db.documents) {
            for (const doc of db.documents) {
                // Skip large file data if tricky, but try to load
                // Assuming file_data is not in JSON for simplicity or is Base64
                await pool.query(
                    `INSERT INTO documents (id, employee_id, category, document_name, file_path, uploaded_at)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [doc.id, doc.employee_id, doc.category, doc.document_name, doc.file_path, doc.uploaded_at]
                );
            }
        }

        // 11. Migrate Education
        console.log(`⏳ Migrating ${db.education?.length || 0} Education Records...`);
        if (db.education) {
            for (const edu of db.education) {
                await pool.query(
                    `INSERT INTO education (id, employee_id, level, school_name, degree_course, year_graduated, honors_awards)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [edu.id, edu.employee_id, edu.level, edu.school_name, edu.degree_course, edu.year_graduated, edu.honors_awards]
                );
            }
        }

        // 12. Reset Sequences
        console.log('⏳ Resetting sequences...');
        const tables = ['users', 'employees', 'attendance', 'settings', 'payslips', 'payroll_runs', 'leave_requests', 'documents', 'education'];
        for (const table of tables) {
            try {
                const seqRes = await pool.query(`SELECT pg_get_serial_sequence($1, 'id') as seq`, [table]);
                if (seqRes.rows[0].seq) {
                    await pool.query(`SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`, [seqRes.rows[0].seq]);
                }
            } catch (e) {
                // ignore
            }
        }

        console.log('🚀 COMPLETE MIGRATION SUCCESSFUL!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

completeMigration();
