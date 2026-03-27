const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/payroll/[id]/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Permissions
content = content.replace(
    /const canApprove = \['Super Admin', 'President', 'Vice President', 'Operations Manager'\]\.includes\(data\.user\.role\);/,
    `const canApprove = ['Super Admin', 'President', 'Vice President', 'Operations Manager', 'Manager'].includes(data.user.role);`
);

// We need to inject the Branch Manager step between HR and Operations Manager.
// Look for the "Operations Manager Step" comment.

const branchManagerStep = `                        {/* Branch Manager Step */}
                        <div className="step-item">
                            <div className="step-left">
                                <div className={\`step-icon \${(payrollRun.workflow_stage || 0) >= 3 ? 'completed' :
                                    (payrollRun.workflow_stage || 0) === 2 && !payrollRun.status.includes('Returned') ? 'active-blue' : 'upcoming'
                                    }\`}>
                                    {(payrollRun.workflow_stage || 0) >= 3 ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (payrollRun.workflow_stage || 0) === 2 && !payrollRun.status.includes('Returned') ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    )}
                                </div>
                                <div className="step-line"></div>
                            </div>
                            <div className="step-content">
                                <div className={\`step-main card-style \${(payrollRun.workflow_stage || 0) === 2 && !payrollRun.status.includes('Returned') ? 'active-card' : ''}\`}>
                                    <div className="step-header">
                                        <span className="step-name">Branch Manager</span>
                                        <span className={\`status-badge \${(payrollRun.workflow_stage || 0) >= 3 ? 'completed' :
                                            payrollRun.status.includes('Returned') && payrollRun.status.includes('Branch Manager') ? 'returned' :
                                                (payrollRun.workflow_stage || 0) === 2 ? 'in-review' : 'pending'
                                            }\`}>
                                            {(payrollRun.workflow_stage || 0) >= 3 ? 'Approved' :
                                                payrollRun.status.includes('Returned') && payrollRun.status.includes('Branch Manager') ? 'Returned' :
                                                    (payrollRun.workflow_stage || 0) === 2 ? 'In Review' : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="step-details-grid">
                                        <div className="detail-group">
                                            <div className="user-icon-small">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            </div>
                                            <div className="detail-text">
                                                <label>APPROVER</label>
                                                <span>{(payrollRun.workflow_stage || 0) >= 3 ? (auditLogs.find(l => l.action === 'APPROVED_BY_BRANCH_MANAGER')?.username || 'Branch Manager') : '-'}</span>
                                            </div>
                                        </div>
                                        <div className="detail-group">
                                            <div className="detail-text">
                                                <label>DATE</label>
                                                <span>{(payrollRun.workflow_stage || 0) >= 3 && auditLogs.find(l => l.action === 'APPROVED_BY_BRANCH_MANAGER')?.performed_at ? new Date(auditLogs.find(l => l.action === 'APPROVED_BY_BRANCH_MANAGER')?.performed_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="italic text-gray-400">-</span>}</span>
                                            </div>
                                        </div>
                                        <div className="detail-group">
                                            <div className="detail-text">
                                                <label>TIME</label>
                                                <span>{(payrollRun.workflow_stage || 0) >= 3 && auditLogs.find(l => l.action === 'APPROVED_BY_BRANCH_MANAGER')?.performed_at ? new Date(auditLogs.find(l => l.action === 'APPROVED_BY_BRANCH_MANAGER')?.performed_at as string).toLocaleTimeString() : <span className="italic text-gray-400">-</span>}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

`;

content = content.replace(
    /\{\/\* Operations Manager Step \*\/\}/,
    branchManagerStep + '                        {/* Operations Manager Step */}'
);

// Operations Manager Step: shift stages (+1)
const opsRegex = /\{\/\* Operations Manager Step \*\/\}[\s\S]*?\{\/\* Vice President Step \*\/\}/;
const opsMatch = content.match(opsRegex);

if (opsMatch) {
    let replacedOps = opsMatch[0]
        .replace(/\(payrollRun\.workflow_stage \|\| 0\) >= 3/g, '(payrollRun.workflow_stage || 0) >= 4')
        .replace(/\(payrollRun\.workflow_stage \|\| 0\) === 2/g, '(payrollRun.workflow_stage || 0) === 3');
    
    content = content.replace(opsRegex, replacedOps);
}

// Vice President Step: shift stages (+1)
const vpRegex = /\{\/\* Vice President Step \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<div className="tracker-footer">/;
const vpMatch = content.match(vpRegex);

if (vpMatch) {
    let replacedVp = vpMatch[0]
        .replace(/\(payrollRun\.workflow_stage \|\| 0\) >= 4/g, '(payrollRun.workflow_stage || 0) >= 5')
        .replace(/\(payrollRun\.workflow_stage \|\| 0\) === 3/g, '(payrollRun.workflow_stage || 0) === 4')
        .replace(/payrollRun\.evp_review_date/g, 'payrollRun.evp_review_date');
    
    content = content.replace(vpRegex, replacedVp);
}


fs.writeFileSync(targetFile, content);
console.log('Frontend script patched successfully');
