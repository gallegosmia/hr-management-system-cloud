const fs = require('fs');
const path = require('path');

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
        // EXACT regex from the latest code
        const tableMatch = normalizedSql.match(/FROM\s+([a-z0-9_]+)(?:\s+[a-z0-9_]+)?/i);
        if (!tableMatch) throw new Error('Table not found in query');
        const table = tableMatch[1].toLowerCase();

        console.log("Found table:", table);

        if (!db[table]) return { rows: [], rowCount: 0 };

        let results = [...db[table]];

        // WHERE clause
        const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/i);
        if (whereMatch) {
            console.log("Found WHERE clause");
            const conditions = whereMatch[1];
            results = results.filter(row => {
                const parts = conditions.split(/\s+AND\s+/i);
                return parts.every(part => {
                    let match;
                    if (match = part.match(/(?:[a-z0-9_]+\.)?([a-z0-9_]+)\s*=\s*\$(\d+)/i)) {
                        const [_, col, paramIdx] = match;
                        return row[col] == params[parseInt(paramIdx) - 1];
                    }
                    return true;
                });
            });
        }

        return { rows: results, rowCount: results.length };
    }
    return { rows: [], rowCount: 0 };
}

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
    console.log("Result success! Count:", res.rows.length);
} catch (e) {
    console.error("Simulation error:", e.message);
}
