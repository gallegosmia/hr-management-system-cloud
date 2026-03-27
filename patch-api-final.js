const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'api', 'payroll', 'runs', '[id]', 'route.ts');
let content = fs.readFileSync(targetPath, 'utf8');

const targetStartText = `        if (action === 'approve') {
            // Check role and stage
            const isManager = user.role === 'Manager';
            const isOps = user.role === 'Operations Manager';
            const isPres = user.role === 'President';
            const isSuper = user.role === 'Super Admin';

            if (!isManager && !isOps && !isPres && !isSuper) {
                return NextResponse.json({ error: 'Unauthorized to approve at this stage' }, { status: 403 });
            }`;

const replaceWithBlock = `        if (action === 'approve') {
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

            // Case 2: Operations Manager Approve (Stage 3 -> Stage 4: VP Review)
            if (payrollRun.workflow_stage === 3 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper && !isPres) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }`;

// The script replaces the entire "Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)" block starting code.
// The easiest way is to find targetStartText, and find the NEXT `// Case 1: Operations Manager Approve` and replace it up to the start of Case 1.

const findOpsCaseStr = `// Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }`;

if (content.includes(targetStartText) && content.includes(findOpsCaseStr)) {
    // First remove the old block start up to findOpsCaseStr
    const parts = content.split(findOpsCaseStr);
    
    // Check if parts[0] has targetStartText. It should be at the very end.
    if (parts[0].includes(targetStartText)) {
        const topSlice = parts[0].substring(0, parts[0].indexOf(targetStartText));
        
        // Assemble!
        content = topSlice + replaceWithBlock + parts.slice(1).join(findOpsCaseStr);
        fs.writeFileSync(targetPath, content, 'utf8');
        console.log("Success backend edit!");
    } else {
        console.log("Failed parsing logic 1");
    }
} else {
    console.log("Failed target not found.");
    if (!content.includes(targetStartText)) console.log("Missing targetStartText");
    if (!content.includes(findOpsCaseStr)) console.log("Missing findOpsCaseStr");
}
