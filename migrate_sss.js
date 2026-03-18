const { Pool } = require('pg');
const fs = require('fs');

async function migrate() {
    console.log('Migrating PostgreSQL database...');
    // Create connection
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'hrms',
        password: 'admin',
        port: 5432,
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sss_contribution_table (
                id SERIAL PRIMARY KEY,
                salary_range_from DECIMAL(10,2) NOT NULL,
                salary_range_to DECIMAL(10,2) NOT NULL,
                msc DECIMAL(10,2) NOT NULL,
                employee_share DECIMAL(10,2) NOT NULL,
                employer_share DECIMAL(10,2) NOT NULL,
                ec_contribution DECIMAL(10,2) NOT NULL,
                total_contribution DECIMAL(10,2) NOT NULL,
                effectivity_year INT NOT NULL
            );
        `);
        console.log('Table sss_contribution_table created in PG.');
    } catch (e) {
        console.log('Skipping PG migration due to connection error (using local JSON only):');
    } finally {
        await pool.end();
    }

    console.log('Migrating Local JSON...');
    try {
        const dbPath = './data/database.json';
        if (fs.existsSync(dbPath)) {
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            if (!db.sss_contribution_table) {
                db.sss_contribution_table = [];
            }

            // Seed 2025 Table data with a few examples if empty
            if (db.sss_contribution_table.length === 0) {
                db.sss_contribution_table.push(
                    {
                        id: 1,
                        salary_range_from: 0,
                        salary_range_to: 4249.99,
                        msc: 4000,
                        employee_share: 200,
                        employer_share: 380,
                        ec_contribution: 10,
                        total_contribution: 590,
                        effectivity_year: 2025
                    },
                    {
                        id: 2,
                        salary_range_from: 4250,
                        salary_range_to: 4749.99,
                        msc: 4500,
                        employee_share: 225,
                        employer_share: 427.50,
                        ec_contribution: 10,
                        total_contribution: 662.50,
                        effectivity_year: 2025
                    },
                    // Add a large bracket for testing
                    {
                        id: 3,
                        salary_range_from: 13250,
                        salary_range_to: 13749.99,
                        msc: 13500,
                        employee_share: 675,
                        employer_share: 1282.50,
                        ec_contribution: 10,
                        total_contribution: 1967.50,
                        effectivity_year: 2025
                    },
                    {
                        id: 4,
                        salary_range_from: 13750,
                        salary_range_to: 9999999.99,
                        msc: 14000,
                        employee_share: 700,
                        employer_share: 1330,
                        ec_contribution: 10,
                        total_contribution: 2040,
                        effectivity_year: 2025
                    }
                );
            }
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            console.log('Seeded local JSON with sss_contribution_table.');
        }
    } catch (e) {
        console.error('JSON migration error.', e);
    }
}

migrate();
