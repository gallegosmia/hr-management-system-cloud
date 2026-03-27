const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (data.payroll_runs) {
        const initialCount = data.payroll_runs.length;
        
        // Delete all DRAFT runs or whatever is stuck
        const toDeleteIds = data.payroll_runs
            .filter(r => r.status && r.status.toUpperCase() === 'DRAFT')
            .map(r => r.id);
            
        data.payroll_runs = data.payroll_runs.filter(r => !toDeleteIds.includes(r.id));
        
        if (data.payslips) {
            data.payslips = data.payslips.filter(p => !toDeleteIds.includes(p.payroll_run_id));
        }
        
        if (data.payroll_audit_log) {
            data.payroll_audit_log = data.payroll_audit_log.filter(a => !toDeleteIds.includes(a.payroll_run_id));
        }

        const deletedCount = initialCount - data.payroll_runs.length;
        
        if (deletedCount > 0) {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            console.log(`Successfully deleted ${deletedCount} DRAFT payroll run(s) and their associated payslips/logs.`);
        } else {
            console.log('No DRAFT payroll runs found to delete.');
            
            // If they meant ALL payroll runs, let's list them just in case
            console.log('Current payroll runs:');
            console.log(data.payroll_runs.map(r => ({ id: r.id, run_number: r.run_number, status: r.status })));
        }
    } else {
        console.log('No payroll_runs table in database.json');
    }
} catch (e) {
    console.error('Error:', e.message);
}
