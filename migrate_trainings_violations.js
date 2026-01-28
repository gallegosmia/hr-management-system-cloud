// Migration: Add trainings, certificates, and violations tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Trainings & Violations Migration...');

        // Create trainings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS employee_trainings (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                training_name VARCHAR(255) NOT NULL,
                training_type VARCHAR(100), -- Internal, External, Online, Workshop
                provider VARCHAR(255),
                date_started DATE,
                date_completed DATE,
                hours_completed DECIMAL(10,2),
                certificate_number VARCHAR(100),
                certificate_file TEXT, -- URL or base64
                status VARCHAR(50) DEFAULT 'Completed', -- Completed, In Progress, Planned
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ employee_trainings table created');

        // Create certificates table (standalone certifications)
        await client.query(`
            CREATE TABLE IF NOT EXISTS employee_certificates (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                certificate_name VARCHAR(255) NOT NULL,
                issuing_organization VARCHAR(255),
                issue_date DATE,
                expiry_date DATE,
                certificate_number VARCHAR(100),
                certificate_file TEXT,
                status VARCHAR(50) DEFAULT 'Active', -- Active, Expired, Revoked
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ employee_certificates table created');

        // Create violations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS employee_violations (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                violation_type VARCHAR(100) NOT NULL, -- Tardiness, Absence, Misconduct, Policy Violation, etc.
                severity VARCHAR(50) DEFAULT 'Minor', -- Minor, Major, Serious, Grave
                incident_date DATE NOT NULL,
                description TEXT NOT NULL,
                action_taken VARCHAR(100), -- Verbal Warning, Written Warning, Suspension, Termination
                action_date DATE,
                action_document TEXT, -- URL or base64
                issued_by INTEGER REFERENCES employees(id),
                acknowledged_by_employee BOOLEAN DEFAULT FALSE,
                acknowledged_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50) DEFAULT 'Active', -- Active, Resolved, Appealed
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ employee_violations table created');

        // Create disciplinary actions/warnings history table
        await client.query(`
            CREATE TABLE IF NOT EXISTS employee_warnings (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                violation_id INTEGER REFERENCES employee_violations(id) ON DELETE SET NULL,
                warning_type VARCHAR(50) NOT NULL, -- Verbal, Written, Final, Suspension Notice
                warning_date DATE NOT NULL,
                reason TEXT NOT NULL,
                duration_days INTEGER, -- For suspensions
                issued_by INTEGER REFERENCES employees(id),
                acknowledged BOOLEAN DEFAULT FALSE,
                acknowledged_at TIMESTAMP WITH TIME ZONE,
                document_file TEXT,
                status VARCHAR(50) DEFAULT 'Active', -- Active, Served, Lifted
                remarks TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ employee_warnings table created');

        console.log('🎉 Migration complete!');
        console.log('');
        console.log('📋 New Tables:');
        console.log('   - employee_trainings: Track employee training programs');
        console.log('   - employee_certificates: Track certifications and licenses');
        console.log('   - employee_violations: Track policy violations');
        console.log('   - employee_warnings: Track disciplinary actions');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
