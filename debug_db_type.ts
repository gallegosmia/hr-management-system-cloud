
import { query, isPostgres, initializeDatabase } from './lib/database';

async function check() {
    await initializeDatabase();
    console.log("Is Postgres:", isPostgres);
    console.log("Database URL present:", !!process.env.DATABASE_URL);

    try {
        const res = await query('SELECT * FROM users');
        console.log("User count:", res.rows.length);
    } catch (error) {
        console.error("Database Error:", error);
    }
}

check();
