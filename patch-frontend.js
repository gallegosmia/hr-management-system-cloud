const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'payroll', '[id]', 'page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const targetStr = `                                        {/* Operations Manager Approve/Return */}
                                        {payrollRun.status === 'Under Review - Operations Manager' &&
                                            (user?.role === 'Admin' || user?.role === 'Operations Manager' || user?.role === 'Super Admin') && (
                                                <>
                                                    <button onClick={handleApprove} className="approve-btn" disabled={processing}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        APPROVE PAYROLL
                                                    </button>
                                                    <button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>
                                                        Return to HR
                                                    </button>
                                                </>
                                            )}`;

const insertStr = `                                        {/* Branch Manager Approve/Return */}
                                        {payrollRun.status === 'Under Review - Branch Manager' &&
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
                                        {payrollRun.status === 'Under Review - Operations Manager' &&
                                            (user?.role === 'Admin' || user?.role === 'Operations Manager' || user?.role === 'Super Admin' || user?.role === 'President') && (
                                                <>
                                                    <button onClick={handleApprove} className="approve-btn" disabled={processing}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        APPROVE PAYROLL
                                                    </button>
                                                    <button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>
                                                        Return to Branch Manager
                                                    </button>
                                                </>
                                            )}`;

if (content.indexOf(targetStr) > -1) {
    fs.writeFileSync(targetPath, content.replace(targetStr, insertStr), 'utf8');
    console.log("Success frontend edit.");
} else {
    console.log("Failed. Target string mismatch for frontend page.tsx.");
}
