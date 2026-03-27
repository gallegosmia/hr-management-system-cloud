import { query } from './lib/database';

async function testDelete() {
    try {
        const payrollRunId = 1;
        
        await query(`
            INSERT INTO audit_logs(user_id, action, details, created_at)
            VALUES($1, $2, $3, CURRENT_TIMESTAMP)
        `, [1, 'DELETE_PAYROLL', JSON.stringify({ 
            payroll_run_id: payrollRunId,
            was_processed: false 
        })]);
        
        console.log('Audit log inserted');

        await query(`DELETE FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);
        console.log('Payslips deleted');
        
        await query(`DELETE FROM payroll_runs WHERE id = $1`, [payrollRunId]);
        console.log('Payroll run deleted');
        
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

testDelete();
