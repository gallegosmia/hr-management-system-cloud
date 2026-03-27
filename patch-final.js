const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'payroll', '[id]', 'page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const targetStatus = "payrollRun.status === 'Under Review - Operations Manager'";

const branchManagerBlock = `payrollRun.status === 'Under Review - Branch Manager' &&
                                            (user?.role === 'Manager' || user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'President') && (
                                                <>
                                                    <button onClick={handleApprove} className="approve-btn" disabled={processing}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        APPROVE PAYROLL
                                                    </button>
                                                    <button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>
                                                        Return to HR
                                                    </button>
                                                </>
                                            )}
                                        
                                        {/* Operations Manager Approve/Return */}
                                        {payrollRun.status === 'Under Review - Operations Manager'`;

if (content.indexOf(targetStatus) > -1 && !content.includes("'Under Review - Branch Manager'")) {
    content = content.split(targetStatus).join(branchManagerBlock);
    
    // Also, we need to change "Return to HR" inside the Operations Manager block to "Return to Branch Manager"
    // We can do this safely because we know Branch Manager is correctly inserted before Operations Manager.
    // The ONLY other place with "Return to HR" AFTER we injected branch manager is the original Operations Manager one.
    // So let's replace all "Return to HR" instances to "Return to Branch" inside Operations Manager
    // A simpler way: we just replaced `targetStatus`. Let's find index of it.
    
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log("Success with simple split-join!");
} else {
    console.log("Failed or already patched");
}
