const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');

        // 1. Get an employee to test with
        const res = await pool.query('SELECT * FROM employees LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No employees found to test update.');
            return;
        }
        const emp = res.rows[0];
        console.log('Testing update on employee:', emp.id);

        // 2. Prepare update data (mimicking the edit page)
        const updateData = {
            first_name: emp.first_name, // keep same name
            salary_info: {
                basic_salary: 20000,
                allowances: { special: 1000 },
                daily_rate: 100,
                hourly_rate: 50,
                pay_frequency: 'Semi-Monthly',
                deductions: {
                    sss_contribution: 100,
                    philhealth_contribution: 100,
                    pagibig_contribution: 100,
                    company_cash_fund: 0,
                    company_loan: { balance: 0, amortization: 0 },
                    sss_loan: { balance: 0, amortization: 0 },
                    pagibig_loan: { balance: 0, amortization: 0 },
                    cash_advance: 0,
                    other_deductions: []
                }
            }
        };

        console.log('Attempting update with data:', JSON.stringify(updateData, null, 2));

        // 3. Perform Update Logic (Simulating lib/database.ts update function)
        const keys = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

        // Try with updated_at first
        const sql = `UPDATE employees SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        console.log('Executing SQL (Try 1):', sql);

        try {
            await pool.query(sql, [emp.id, ...values]);
            console.log('✅ Update 1 successful');
        } catch (e) {
            console.log('❌ Update 1 failed:', e.message);

            // Fallback
            const sqlPlain = `UPDATE employees SET ${setClause} WHERE id = $1`;
            console.log('Executing SQL (Fallback):', sqlPlain);
            try {
                await pool.query(sqlPlain, [emp.id, ...values]);
                console.log('✅ Update Fallback successful');
            } catch (e2) {
                console.error('❌ Update Fallback failed:', e2);
            }
        }

    } catch (err) {
        console.error('❌ Global Error:', err);
    } finally {
        await pool.end();
    }
}

run();
