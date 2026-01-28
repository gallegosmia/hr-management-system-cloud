const { query } = require('./lib/database');

async function test() {
    console.log("Starting query test...");
    try {
        const sql = `
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.is_active, 
                u.employee_id, 
                u.last_login, 
                u.created_at,
                u.two_fa_enabled,
                u.email as user_email,
                e.first_name,
                e.last_name,
                e.email_address as employee_email
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
        `;
        const res = await query(sql);
        console.log("Query success! Rows:", res.rows.length);
        if (res.rows.length > 0) {
            console.log("First row keys:", Object.keys(res.rows[0]));
        }
    } catch (err) {
        console.error("Test Error:", err);
    }
}

test();
