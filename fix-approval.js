const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'api', 'payroll', 'runs', '[id]', 'route.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const targetBlock = `            // Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }`;

const replacementBlock = `            // Case 1: Branch Manager Approve (Stage 2 -> Stage 3: Operations Manager Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Branch Manager') {
                if (!isManager && !isSuper && !isPres) {
                    return NextResponse.json({ error: 'Only Branch Manager can approve at this stage' }, { status: 403 });
                }

                await query(\`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Operations Manager',
                        workflow_stage = 3,
                        current_reviewer_role = 'Operations Manager',
                        updated_at = NOW()
                    WHERE id = $1
                \`, [payrollRunId]);

                // Notify Ops Manager
                const opsUsers = await query("SELECT id FROM users WHERE role IN ('Operations Manager', 'Super Admin')");
                for (const ops of opsUsers.rows) {
                    let formattedPeriod = '';
                    try {
                        const d1 = new Date(payrollRun.payroll_period_start);
                        const d2 = new Date(payrollRun.payroll_period_end);
                        formattedPeriod = \`\${d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–\${d2.getDate()}, \${d2.getFullYear()}\`;
                    } catch (e) {
                        formattedPeriod = \`\${payrollRun.payroll_period_start} to \${payrollRun.payroll_period_end}\`;
                    }

                    await query(\`
                        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, is_read, created_at, link)
                        VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), $7)
                    \`, [ops.id, 'PAYROLL_PENDING_OPS', 'Payroll Awaiting Operations Approval', \`Payroll for \${formattedPeriod} requires Operations Manager approval.\`, payrollRunId.toString(), 'payroll', \`/payroll/\${payrollRunId}\`]);
                }

                await query(\`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                \`, [payrollRunId, 'APPROVED_BY_BRANCH_MANAGER', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

                return NextResponse.json({ success: true, message: 'Approved by Branch Manager. Forwarded to Operations Manager.' });
            }

            // Case 2: Operations Manager Approve (Stage 3 -> Stage 4: VP Review)
            if (payrollRun.workflow_stage === 3 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper && !isPres) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }`;

if (content.includes(targetBlock)) {
    content = content.replace(targetBlock, replacementBlock);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully updated the approval flow logic for Branch Manager.');
} else {
    console.log('Target block not found. Checking if it already includes Case 2...');
    if (content.includes('Case 2: Operations Manager Approve')) {
         console.log('Logically it has already been patched.');
    } else {
         console.log('NOT FOUND! Here is the actual block:');
         console.log(content.substring(content.indexOf('action === \\'approve\\''), content.indexOf('action === \\'approve\\'') + 500));
    }
}
