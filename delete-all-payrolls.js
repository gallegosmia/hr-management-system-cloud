/**
 * Delete All Payroll Data from Local JSON Database
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

function deleteAllPayrollData() {
    try {
        console.log('Reading database from:', DB_PATH);

        // Read current database
        const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

        // Count before deletion
        const payrollCount = dbData.payroll_runs ? dbData.payroll_runs.length : 0;
        const payslipCount = dbData.payslips ? dbData.payslips.length : 0;
        const auditCount = dbData.payroll_audit_log ? dbData.payroll_audit_log.length : 0;

        console.log(`\nFound:`);
        console.log(`  - ${payrollCount} payroll runs`);
        console.log(`  - ${payslipCount} payslips`);
        console.log(`  - ${auditCount} audit log entries`);

        // Delete all payroll data
        dbData.payroll_runs = [];
        dbData.payslips = [];
        if (dbData.payroll_audit_log) {
            dbData.payroll_audit_log = [];
        }

        // Write back to file
        fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));

        console.log(`\n✅ Successfully deleted:`);
        console.log(`  - ${payrollCount} payroll runs`);
        console.log(`  - ${payslipCount} payslips`);
        console.log(`  - ${auditCount} audit log entries`);
        console.log('\n✅ All payroll data has been cleared!');
        console.log('Please refresh the payroll page.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

deleteAllPayrollData();
