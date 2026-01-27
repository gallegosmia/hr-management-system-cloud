
import { query } from './lib/database';

async function check() {
    try {
        console.log("Testing API Query...");
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
        console.log("Joined User count:", res.rows.length);
        if (res.rows.length > 0) {
            console.log("First row:", JSON.stringify(res.rows[0], null, 2));
        }
    } catch (error) {
        console.error("Database Error:", error);
    }
}

check();
