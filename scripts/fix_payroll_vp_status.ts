import db from '../lib/database';

async function fixPayrollVpStatus() {
    console.log('🔍 Starting Payroll VP Status Auto-Correction Script...');

    try {
        // We are looking for runs that are marked as 'Released' but don't have explicit VP 'Approved'
        // in evp_review_status, or their workflow_stage is less than 4.
        const sql = `
      SELECT id, run_number, status, workflow_stage, evp_review_status
      FROM payroll_runs 
      WHERE status = 'Released' 
      AND (evp_review_status != 'Approved' OR evp_review_status IS NULL OR workflow_stage < 4)
    `;

        const { rows, rowCount } = await db.query(sql);

        if (rowCount === 0) {
            console.log('✅ No invalid payroll runs found. Database is consistent.');
            return;
        }

        console.log(`⚠️ Found ${rowCount} invalid payroll runs marked as 'Released' without proper VP Approval.`);

        let fixedCount = 0;

        for (const run of rows) {
            console.log(`- Fixing Run # ${run.run_number} (ID: ${run.id}). Currently: ${run.status}, VP Status: ${run.evp_review_status}`);

            const updateSql = `
        UPDATE payroll_runs 
        SET status = 'Under Review - Vice President', 
            workflow_stage = 3
        WHERE id = $1
      `;

            await db.query(updateSql, [run.id]);

            // Add audit log
            const auditSql = `
        INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
            const details = JSON.stringify({
                reason: 'Auto-corrected unapproved Released status',
                previous_status: run.status
            });
            await db.query(auditSql, [run.id, 'SYSTEM_REVERT', 0, details, new Date().toISOString()]);

            fixedCount++;
        }

        console.log(`✅ Successfully corrected ${fixedCount} payroll runs to 'Under Review - Vice President'.`);

    } catch (error) {
        console.error('❌ Error executing fix:', error);
    } finally {
        console.log('🏁 Script finished.');
    }
}

fixPayrollVpStatus();
