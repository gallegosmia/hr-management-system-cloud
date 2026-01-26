const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    let DATABASE_URL = 'postgresql://neondb_owner:npg_vlVJhnqyNk79@ep-broad-truth-a1ouv160-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('✅ Loaded local data');

        // Apply Schema (only primary tables)
        console.log('⏳ Creating tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role VARCHAR(50) NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                middle_name VARCHAR(100),
                department VARCHAR(100),
                position VARCHAR(100),
                branch VARCHAR(100),
                employment_status VARCHAR(50),
                salary_info JSONB,
                file_completion_status VARCHAR(20) DEFAULT 'Incomplete'
            );
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER,
                date DATE,
                time_in TIME,
                time_out TIME,
                status VARCHAR(50)
            );
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value JSONB NOT NULL,
                description TEXT
            );
        `);

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

        console.log('⏳ Migrating Settings...');
        if (db.settings) {
            for (const s of db.settings) {
                await pool.query(
                    'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
                    [s.key, JSON.stringify(s.value), s.description]
                );
            }
        }

        console.log('🚀 SUCCESS: Core data migrated to new database!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
