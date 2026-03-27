const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'api', 'payroll', 'runs', '[id]', 'route.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const anchor1 = "if (action === 'approve') {";
const anchor2 = "// Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)";

// We want to replace everything from anchor1 up to the start of anchor2
const replaceWithBlock = `if (action === 'approve') {
            // Check role and stage
            const isManager = user.role === 'Manager';
            const isOps = user.role === 'Operations Manager';
            const isPres = user.role === 'President';
            const isSuper = user.role === 'Super Admin';

            if (!isManager && !isOps && !isPres && !isSuper) {
                return NextResponse.json({ error: 'Unauthorized to approve at this stage' }, { status: 403 });
            }

            // Case 1: Branch Manager Approve (Stage 2 -> Stage 3: Operations Manager Review)
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
                    \`, [
                        ops.id,
                        'PAYROLL_PENDING_OPS',
                        'Payroll Awaiting Operations Approval',
                        \`Payroll for \${formattedPeriod} requires Operations Manager approval.\`,
                        payrollRunId.toString(),
                        'payroll',
                        \`/payroll/\${payrollRunId}\`
                    ]);
                }

                await query(\`
                    INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
                    VALUES ($1, $2, $3, $4, $5)
                \`, [payrollRunId, 'APPROVED_BY_BRANCH_MANAGER', user.id, JSON.stringify({ run_number: payrollRun.run_number }), new Date().toISOString()]);

                return NextResponse.json({ success: true, message: 'Approved by Branch Manager. Forwarded to Operations Manager.' });
            }

            `;

const id1 = content.indexOf(anchor1);
const id2 = content.indexOf(anchor2, id1);

if (id1 > -1 && id2 > -1 && !content.includes("Case 1: Branch Manager Approve")) {
    const head = content.substring(0, id1);
    const tail = content.substring(id2);
    content = head + replaceWithBlock + tail;
    
    // Also change Operations Manager check to Stage 3 and block Branch Manager from approving it
    const opsStr = "if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Operations Manager') {";
    content = content.replace(opsStr, "if (payrollRun.workflow_stage === 3 || payrollRun.status === 'Under Review - Operations Manager') {");
    
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log("Success backend edit!");
} else {
    console.log("Failed target not found or already patched.", id1, id2);
}
