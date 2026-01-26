const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    let DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/DATABASE_URL=['"]?(.+?)['"]?\s*$/m);
            if (match) DATABASE_URL = match[1];
        }
    }

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not found.');
        return;
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('✅ Loaded local data');

        // Apply Schema
        console.log('⏳ Applying schema...');
        const schemaFile = path.join(process.cwd(), 'data', 'schema.sql');
        const schema = fs.readFileSync(schemaFile, 'utf-8');
        const queries = schema.split(';').filter(q => q.trim() !== '');
        for (let q of queries) {
            await pool.query(q);
        }

        // Migrate in order
        console.log('⏳ Migrating Users...');
        for (const user of db.users) {
            await pool.query(
                'INSERT INTO users (id, username, password, role, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
                [user.id, user.username, user.password, user.role, user.is_active || 1]
            );
        }

        console.log('⏳ Migrating Employees...');
        for (const emp of db.employees) {
            await pool.query(
                'INSERT INTO employees (id, employee_id, last_name, first_name, middle_name, department, position, branch, employment_status, salary_info, file_completion_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING',
                [emp.id, emp.employee_id, emp.last_name, emp.first_name, emp.middle_name, emp.department, emp.position, emp.branch, emp.employment_status, JSON.stringify(emp.salary_info), emp.file_completion_status]
            );
        }

        console.log('⏳ Migrating Attendance...');
        if (db.attendance) {
            for (const att of db.attendance) {
                await pool.query(
                    'INSERT INTO attendance (id, employee_id, date, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                    [att.id, att.employee_id, att.date, att.status]
                );
            }
        }

        // Skip payslips for now to avoid foreign key errors with payroll_runs
        console.log('⏳ Data transfer complete (Users, Employees, Attendance migrated).');

        // Reset sequences
        const tables = ['users', 'employees', 'attendance'];
        for (const table of tables) {
            await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
        }

        console.log('🚀 SUCCESS!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
Sands
