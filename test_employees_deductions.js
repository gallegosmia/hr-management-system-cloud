require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function test() {
    try {
        await client.connect();
        const res = await client.query(`SELECT first_name, last_name, salary_info->>'deductions' AS deductions FROM employees LIMIT 5`);
        console.log("Employees deductions:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
test();
