
const { getAllEmployees, getEmployeeById } = require('./lib/data');

async function testIntegrity() {
    const employees = await getAllEmployees();
    console.log(`Masterlist count: ${employees.length}`);

    let failures = 0;
    for (const emp of employees) {
        const found = await getEmployeeById(emp.id);
        if (!found) {
            console.log(`FAIL: Employee ${emp.first_name} ${emp.last_name} has ID ${emp.id} but cannot be fetched by it!`);
            failures++;
        }
    }

    if (failures === 0) {
        console.log('SUCCESS: All employees can be fetched by their ID.');
    } else {
        console.log(`TOTAL FAILURES: ${failures}`);
    }
}

testIntegrity();
