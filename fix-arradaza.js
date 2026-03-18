const { query } = require('./lib/database.js');

async function run() {
    try {
        console.log('Fetching Arradaza...');
        const res = await query("SELECT id, first_name, last_name, special_allowance FROM employees WHERE last_name ILIKE '%Arradaza%'");
        console.log('Found:', res.rows);

        if (res.rows.length > 0) {
            const empId = res.rows[0].id;
            console.log(`Updating employee ${empId}`);
            const updateRes = await query("UPDATE employees SET special_allowance = 500 WHERE id = $1 RETURNING *", [empId]);
            console.log('Updated:', updateRes.rows[0]);
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit();
}
run();
