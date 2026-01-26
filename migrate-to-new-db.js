const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    let DATABASE_URL = process.env.DATABASE_URL;

    // Manually load from .env if not in process.env
    if (!DATABASE_URL) {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/DATABASE_URL=['"]?(.+?)['"]?\s*$/m);
            if (match) DATABASE_URL = match[1];
        }
    }

    if (!fs.existsSync(DB_FILE)) {
        console.error('❌ database.json not found in data folder.');
        return;
    }

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in environment or .env file.');
        return;
    }

    console.log(`⏳ Connecting to: ${DATABASE_URL.split('@')[1]}`);

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('✅ Loaded local database.json');

        // Apply Schema
        console.log('⏳ Applying database schema...');
        const schemaFile = path.join(process.cwd(), 'data', 'schema.sql');
        if (fs.existsSync(schemaFile)) {
            const schema = fs.readFileSync(schemaFile, 'utf-8');
            const queries = schema.split(';').filter(q => q.trim() !== '');
            for (let q of queries) {
                await pool.query(q);
            }
            console.log('✅ Schema applied successfully');
        }

        // Migrate Users
        console.log('⏳ Migrating users...');
        for (const user of db.users) {
            await pool.query(
                'INSERT INTO users (id, username, password, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username',
                [user.id, user.username, user.password, user.role, user.is_active || 1, user.created_at || new Date()]
            );
        }

        // Migrate Employees
        console.log('⏳ Migrating employees...');
        for (const emp of db.employees) {
            await pool.query(
                `INSERT INTO employees (
                    id, employee_id, last_name, first_name, middle_name, department, position, branch, 
                    employment_status, date_hired, date_of_birth, sss_number, philhealth_number, 
                    pagibig_number, tin, civil_status, salary_info, file_completion_status, profile_picture
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
                ON CONFLICT (id) DO NOTHING`,
                [
                    emp.id, emp.employee_id, emp.last_name, emp.first_name, emp.middle_name, emp.department,
                    emp.position, emp.branch, emp.employment_status, emp.date_hired, emp.date_of_birth,
                    emp.sss_number, emp.philhealth_number, emp.pagibig_number, emp.tin, emp.civil_status,
                    JSON.stringify(emp.salary_info), emp.file_completion_status, emp.profile_picture
                ]
            );
        }

        // Migrate Attendance
        console.log('⏳ Migrating attendance...');
        if (db.attendance) {
            for (const att of db.attendance) {
                await pool.query(
                    'INSERT INTO attendance (id, employee_id, date, time_in, time_out, status, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                    [att.id, att.employee_id, att.date, att.time_in, att.time_out, att.status, att.remarks]
                );
            }
        }

        // Migrate Payslips
        console.log('⏳ Migrating payslips...');
        if (db.payslips) {
            for (const p of db.payslips) {
                await pool.query(
                    'INSERT INTO payslips (id, payroll_run_id, employee_id, gross_pay, net_pay, total_deductions, total_allowances, deduction_details, allowance_details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                    [p.id, p.payroll_run_id, p.employee_id, p.gross_pay, p.net_pay, p.total_deductions, p.total_allowances, JSON.stringify(p.deduction_details), JSON.stringify(p.allowance_details)]
                );
            }
        }

        // Migrate Settings
        console.log('⏳ Migrating settings...');
        for (const s of (db.settings || [])) {
            await pool.query(
                'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
                [s.key, JSON.stringify(s.value), s.description]
            );
        }

        // Reset sequences
        console.log('⏳ Resetting database sequences...');
        const tables = ['users', 'employees', 'attendance', 'payslips', 'settings'];
        for (const table of tables) {
            await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
        }

        console.log('🚀 SUCCESS: Data copied to new Neon database!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
