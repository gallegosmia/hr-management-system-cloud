const { query } = require('./lib/database');

async function testApiLogic() {
    console.log("Simulating joined query in Local Fallback mode...");
    const sql = `
            SELECT 
                u.id, u.username, u.role, u.is_active, u.employee_id, u.last_login, u.created_at, u.two_fa_enabled,
                u.email as user_email, e.first_name, e.last_name, e.email_address as employee_email
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
    `;

    try {
        // Since we modified lib/database to trigger fallback on certain errors,
        // and we know cloud is full, it should switch to local.
        const res = await query(sql);
        console.log("Fallback Row Count:", res.rows.length);
        if (res.rows.length > 0) {
            const u = res.rows[0];
            const safe = {
                id: u.id,
                username: u.username || 'unknown',
                full_name: u.first_name ? `${u.first_name} ${u.last_name}` : (u.full_name || u.username || 'User'),
                two_fa_enabled: u.two_fa_enabled === 1 || u.two_fa_enabled === true
            };
            console.log("Sample Mapped User:", JSON.stringify(safe, null, 2));
        }
    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

testApiLogic();
