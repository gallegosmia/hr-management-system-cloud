
const { getEmployeeById } = require('./lib/data');
const { query } = require('./lib/database');

async function testGetEmployee(id) {
    console.log(`Testing ID: ${id}`);
    const cleanId = String(id).trim();
    let employee = null;

    if (/^\d+$/.test(cleanId)) {
        console.log('Attempting getEmployeeById...');
        employee = await getEmployeeById(parseInt(cleanId));
    }

    if (!employee) {
        console.log('Attempting query by employee_id...');
        try {
            const res = await query("SELECT * FROM employees WHERE UPPER(employee_id) = UPPER($1)", [cleanId]);
            employee = res.rows[0];
        } catch (e) {
            console.log('Query failed:', e.message);
        }
    }

    if (employee) {
        console.log('Found employee:', employee.first_name, employee.last_name);
    } else {
        console.log('Employee NOT FOUND');
    }
}

async function run() {
    await testGetEmployee(1);
    await testGetEmployee('2025-0001');
}

run();
