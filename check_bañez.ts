const { query } = require('./lib/database');
async function run() {
    try {
        const r = await query("SELECT first_name, last_name, employment_status, date_separated FROM employees WHERE last_name ILIKE '%baez%' OR last_name ILIKE '%ba%' OR first_name ILIKE '%ba%'");
        console.log(JSON.stringify(r.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
run();
export {};
