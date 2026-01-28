const fs = require('fs');
const path = require('path');

// Simulate the logic from lib/database.js
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

function loadDB() {
    if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
    return { users: [] };
}

function simulateQuery(sql, params = []) {
    const db = loadDB();
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');

    if (normalizedSql.match(/^SELECT/i)) {
        // Updated regex from our fix
        const tableMatch = normalizedSql.match(/FROM\s+([a-z0-9_]+)(?:\s+[a-z0-9_]+)?/i);
        if (!tableMatch) throw new Error('Table not found in query');
        const table = tableMatch[1].toLowerCase();

        console.log("Matched table:", table);

        if (!db[table]) return { rows: [], rowCount: 0 };
        let results = [...db[table]];
        return { rows: results, rowCount: results.length };
    }
    return { rows: [], rowCount: 0 };
}

// The problematic query from route.ts
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

try {
    const res = simulateQuery(sql);
    console.log("Simulation Result Rows:", res.rows.length);
    if (res.rows.length > 0) {
        console.log("First User:", res.rows[0].username);
    }
} catch (e) {
    console.error("Simulation Failed:", e.message);
}
