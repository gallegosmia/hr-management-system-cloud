const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(raw);

    console.log(`Scanning ${data.employees.length} employees...`);
    let updatedCount = 0;

    data.employees = data.employees.map(emp => {
        if (emp.branch) {
            const oldBranch = emp.branch;
            // Remove " Branch" suffix if present (case insensitive)
            const newBranch = oldBranch.replace(/\s+Branch$/i, '').trim();

            if (oldBranch !== newBranch) {
                emp.branch = newBranch;
                updatedCount++;
                console.log(`Updated: ${emp.first_name} ${emp.last_name} | "${oldBranch}" -> "${newBranch}"`);
            }
        }
        return emp;
    });

    if (updatedCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        console.log(`\n✅ Successfully updated ${updatedCount} employees.`);
    } else {
        console.log('\n✅ No changes needed.');
    }

} catch (e) {
    console.error('Error updating DB:', e);
}
