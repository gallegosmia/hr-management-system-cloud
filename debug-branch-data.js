
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hr_system',
    password: 'admin',
    port: 5432,
});

async function debugData() {
    try {
        console.log("=== USERS ===");
        const users = await pool.query("SELECT id, username, role, assigned_branch, hr_approval_status FROM users ORDER BY username");
        users.rows.forEach(u => {
            console.log(`User: ${u.username} | Role: ${u.role} | Branch: '${u.assigned_branch}' | Status: ${u.hr_approval_status}`);
        });

        console.log("\n=== EMPLOYEES BY BRANCH ===");
        const branches = await pool.query("SELECT branch, COUNT(*) as count FROM employees GROUP BY branch");
        branches.rows.forEach(b => {
            console.log(`Branch: '${b.branch}' | Count: ${b.count}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugData();
