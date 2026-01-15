const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.kxwevzvztrdcksuvkwqf:HR-System-Cloud-2026!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');

        // Simulate Create Employee Payload
        const newEmployee = {
            employee_id: '2017-0001',
            last_name: 'LANGRES',
            first_name: 'RAMIL',
            middle_name: 'MOLINA',
            department: 'Operations',
            position: 'SUPERVISOR',
            branch: 'Ormoc Branch',
            employment_status: 'Regular',
            date_hired: '2017-01-25',
            date_of_birth: '1980-03-18',
            civil_status: 'Married',
            personal_info_complete: 0,
            preemployment_req_complete: 0,
            government_docs_complete: 0,
            employment_records_complete: 0,
            attendance_records_complete: 0,
            payroll_records_complete: 0,
            disciplinary_records: 0,
            training_records: 0,
            separation_records: 0,
            file_completion_status: 'Incomplete',
            created_by: 1
        };

        console.log('Attempting to create employee:', newEmployee.employee_id);

        // 1. Insert Employee
        const keys = Object.keys(newEmployee);
        const values = Object.values(newEmployee);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO employees (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;

        let empId;
        try {
            const res = await pool.query(sql, values);
            empId = res.rows[0].id;
            console.log('✅ Employee inserted with ID:', empId);
        } catch (e) {
            console.error('❌ Insert Employee Failed:', e.message);
            // It might fail on unique constraint if I just ran it, so let's check duplicates
            if (e.message.includes('duplicate key')) {
                console.log('⚠️  Duplicate key error. This might mean the previous failed attempt actually succeeded in DB part 1 but failed later.');
            }
            return;
        }

        // 2. Insert Audit Log (Simulating logAudit)
        const auditData = {
            user_id: 1,
            action: 'CREATE_EMPLOYEE',
            // ip_address: undefined 
            details: JSON.stringify({
                table_name: 'employees',
                record_id: empId,
                new_value: JSON.stringify(newEmployee)
            })
        };

        console.log('Attempting to insert audit log...');
        try {
            const auditKeys = Object.keys(auditData);
            const auditValues = Object.values(auditData);
            const auditPlaceholders = auditKeys.map((_, i) => `$${i + 1}`).join(', ');

            // This mimics "insert('audit_logs', { user_id, action, details })"
            const auditSql = `INSERT INTO audit_logs (${auditKeys.join(', ')}) VALUES (${auditPlaceholders}) RETURNING id`;

            await pool.query(auditSql, auditValues);
            console.log('✅ Audit Log inserted successfully');
        } catch (e) {
            console.error('❌ Insert Audit Log Failed:', e.message);
        }

    } catch (err) {
        console.error('❌ Global Error:', err);
    } finally {
        await pool.end();
    }
}

run();
