const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!fs.existsSync(DB_FILE)) {
        console.error('❌ database.json not found in data folder.');
        return;
    }

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable not set.');
        return;
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log('✅ Loaded database.json');

        // Apply Schema
        console.log('⏳ Applying database schema...');
        const schemaFile = path.join(process.cwd(), 'data', 'schema.sql');
        if (fs.existsSync(schemaFile)) {
            const schema = fs.readFileSync(schemaFile, 'utf-8');
            // Split by semicolon and filter out empty strings to run queries one by one
            const queries = schema.split(';').filter(q => q.trim() !== '');
            for (let q of queries) {
                await pool.query(q);
            }
            console.log('✅ Schema applied successfully');
        } else {
            console.warn('⚠️ schema.sql not found, skipping schema application.');
        }

        // Migrate Users
        console.log('Migrating users...');
        for (const user of db.users) {
            await pool.query(
                'INSERT INTO users (id, username, password, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
                [user.id, user.username, user.password, user.role, user.is_active || 1, user.created_at || new Date()]
            );
        }

        // Migrate Employees
        console.log('Migrating employees...');
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

        // Migrate Settings
        console.log('Migrating settings...');

        // Ensure settings table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value JSONB NOT NULL,
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        for (const s of db.settings) {
            await pool.query(
                'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
                [s.key, JSON.stringify(s.value), s.description]
            );
        }

        console.log('🚀 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
