const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/api/payroll/runs/[id]/route.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// Backfill logic GET
content = content.replace(
    /if \(payrollRun\.workflow_stage == null \|\| payrollRun\.workflow_stage === 0\) \{\s+const s = \(payrollRun\.status \|\| ''\)\.toLowerCase\(\);\s+if \(s\.includes\('operations'\)\) payrollRun\.workflow_stage = 2;\s+else if \(s\.includes\('vice president'\)\) payrollRun\.workflow_stage = 4;\s+else if \(s\.includes\('president'\) && !s\.includes\('vice'\)\) payrollRun\.workflow_stage = 3;\s+else if \(\['for release', 'approved', 'released', 'locked'\]\.includes\(s\)\) payrollRun\.workflow_stage = 5;\s+else if \(s === 'draft'\) payrollRun\.workflow_stage = 1;\s+\}/,
    `if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('branch manager')) payrollRun.workflow_stage = 2;
            else if (s.includes('operations')) payrollRun.workflow_stage = 3;
            else if (s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }`
);

// Enforcement GET
content = content.replace(
    /if \(payrollRun\.status === 'Released' && \(payrollRun\.workflow_stage < 4 \|\| payrollRun\.evp_review_status !== 'Approved'\)\) \{/g,
    `if (payrollRun.status === 'Released' && (payrollRun.workflow_stage < 5 || payrollRun.evp_review_status !== 'Approved')) {`
);

// Backfill logic PATCH
content = content.replace(
    /if \(payrollRun\.workflow_stage == null \|\| payrollRun\.workflow_stage === 0\) \{\s+const s = \(payrollRun\.status \|\| ''\)\.toLowerCase\(\);\s+if \(s\.includes\('operations'\)\) payrollRun\.workflow_stage = 2;\s+else if \(s\.includes\('president'\) && !s\.includes\('vice'\)\) payrollRun\.workflow_stage = 3;\s+else if \(s\.includes\('vice president'\)\) payrollRun\.workflow_stage = 4;\s+else if \(\['for release', 'approved', 'released', 'locked'\]\.includes\(s\)\) payrollRun\.workflow_stage = 5;\s+else if \(s === 'draft'\) payrollRun\.workflow_stage = 1;\s+\}/,
    `if (payrollRun.workflow_stage == null || payrollRun.workflow_stage === 0) {
            const s = (payrollRun.status || '').toLowerCase();
            if (s.includes('branch manager')) payrollRun.workflow_stage = 2;
            else if (s.includes('operations')) payrollRun.workflow_stage = 3;
            else if (s.includes('vice president')) payrollRun.workflow_stage = 4;
            else if (['for release', 'approved', 'released', 'locked'].includes(s)) payrollRun.workflow_stage = 5;
            else if (s === 'draft') payrollRun.workflow_stage = 1;
        }`
);

// Finalize 
content = content.replace(
    /UPDATE payroll_runs\s+SET status = 'Under Review - Operations Manager', \s+workflow_stage = 2, \s+current_reviewer_role = 'Operations Manager',/,
    `UPDATE payroll_runs
                    SET status = 'Under Review - Branch Manager', 
                        workflow_stage = 2, 
                        current_reviewer_role = 'Manager',`
);

// Finalize target users
content = content.replace(
    /const targetUsers = await query\("SELECT id FROM users WHERE role IN \('Operations Manager', 'Vice President', 'Super Admin'\)"\);/,
    `const targetUsers = await query("SELECT id FROM users WHERE role IN ('Manager', 'Super Admin')");`
);

// Approve
content = content.replace(
    /const isOps = user\.role === 'Operations Manager';\s+const isPres = user\.role === 'President';\s+const isSuper = user\.role === 'Super Admin';\s+if \(!isOps && !isPres && !isSuper\) \{\s+return NextResponse\.json\(\{ error: 'Unauthorized to approve at this stage' \}, \{ status: 403 \}\);\s+\}/,
    `const isManager = user.role === 'Manager';
            const isOps = user.role === 'Operations Manager';
            const isPres = user.role === 'President';
            const isSuper = user.role === 'Super Admin';

            if (!isManager && !isOps && !isPres && !isSuper) {
                return NextResponse.json({ error: 'Unauthorized to approve at this stage' }, { status: 403 });
            }`
);

const opsApproveBlock = `
            // Case 1: Operations Manager Approve (Stage 2 -> Stage 3: VP Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }

                await query(\`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Vice President',
                        workflow_stage = 3,
                        current_reviewer_role = 'Vice President',
                        updated_at = NOW()
                    WHERE id = $1
                \`, [payrollRunId]);

                // Notify VP
`;

const newApproveBlock = `
            // Case A: Branch Manager Approve (Stage 2 -> Stage 3: Operations Manager Review)
            if (payrollRun.workflow_stage === 2 || payrollRun.status === 'Under Review - Branch Manager') {
                if (!isManager && !isSuper) {
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

                // Notify Ops
                const opsUsers = await query("SELECT id FROM users WHERE role IN ('Operations Manager', 'Super Admin')");
                for (const tu of opsUsers.rows) {
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
                        tu.id,
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

            // Case B: Operations Manager Approve (Stage 3 -> Stage 4: VP Review)
            if (payrollRun.workflow_stage === 3 || payrollRun.status === 'Under Review - Operations Manager') {
                if (!isOps && !isSuper) {
                    return NextResponse.json({ error: 'Only Operations Manager can approve at this stage' }, { status: 403 });
                }

                await query(\`
                    UPDATE payroll_runs
                    SET status = 'Under Review - Vice President',
                        workflow_stage = 4,
                        current_reviewer_role = 'Vice President',
                        updated_at = NOW()
                    WHERE id = $1
                \`, [payrollRunId]);

                // Notify VP
`;

content = content.replace(opsApproveBlock, newApproveBlock);

// Final approve cases
content = content.replace(/payrollRun\.workflow_stage === 4/g, 'payrollRun.workflow_stage === 5');
content = content.replace(/payrollRun\.workflow_stage !== 3/g, 'payrollRun.workflow_stage !== 4');
content = content.replace(/workflow_stage = 4/g, 'workflow_stage = 5');

// Return logic
const oldReturnBlock = `            if (payrollRun.status.includes('Operations Manager')) {
                // Return to HR
                if (user.role !== 'Operations Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to HR';
                auditAction = 'RETURNED_TO_HR';
                targetRole = 'HR';
            } else if (payrollRun.status.includes('President') && !payrollRun.status.includes('Vice')) {
                // President returning to Operations Manager
                if (user.role !== 'President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Operations Manager';
                auditAction = 'RETURNED_TO_OPS';
                targetRole = 'Operations Manager';
            } else if (payrollRun.status === 'Under Review - Vice President') {
                // VP returning to President
                if (user.role !== 'Vice President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to President';
                auditAction = 'RETURNED_TO_PRESIDENT';
                targetRole = 'President';
            } else {
                return NextResponse.json({ error: 'Cannot return from current status' }, { status: 400 });
            }`;

const newReturnBlock = `            if (payrollRun.status.includes('Operations Manager')) {
                // Return to Branch Manager
                if (user.role !== 'Operations Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Branch Manager';
                auditAction = 'RETURNED_TO_BRANCH_MANAGER';
                targetRole = 'Branch Manager';
            } else if (payrollRun.status.includes('Branch Manager')) {
                // Return to HR
                if (user.role !== 'Manager' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to HR';
                auditAction = 'RETURNED_TO_HR';
                targetRole = 'HR';
            } else if (payrollRun.status === 'Under Review - Vice President') {
                // VP returning to Operations Manager
                if (user.role !== 'Vice President' && user.role !== 'Super Admin') return NextResponse.json({ error: 'Unauthorized return' }, { status: 403 });
                newStatus = 'Returned to Operations Manager';
                auditAction = 'RETURNED_TO_OPS';
                targetRole = 'Operations Manager';
            } else {
                return NextResponse.json({ error: 'Cannot return from current status' }, { status: 400 });
            }`;

content = content.replace(oldReturnBlock, newReturnBlock);

fs.writeFileSync(targetFile, content);
console.log('Script patched successfully');
