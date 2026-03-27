const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'payroll', '[id]', 'page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const targetStr = "payrollRun.status === 'Under Review - Operations Manager'";

const index = content.indexOf(targetStr);
if (index > -1) {
    // We want to insert the Branch Manager block RIGHT BEFORE the Operations Manager block.
    // Let's find the start of the Operations Manager block (the comment line)
    // We look backwards for "Operations Manager Approve/Return"
    const commentStr = "{/* Operations Manager Approve/Return */}";
    const commentIndex = content.lastIndexOf(commentStr, index);
    
    if (commentIndex > -1) {
        // We will insert BEFORE the commentIndex, retaining all original formatting.
        // We figure out the indentation by scanning backward to the newline
        const nlIndex = content.lastIndexOf('\\n', commentIndex);
        const indentStr = content.substring(nlIndex + 1, commentIndex);
        
        const branchBlock = 
\`{/* Branch Manager Approve/Return */}
\${indentStr}{payrollRun.status === 'Under Review - Branch Manager' &&
\${indentStr}    (user?.role === 'Manager' || user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'President') && (
\${indentStr}        <>
\${indentStr}            <button onClick={handleApprove} className="approve-btn" disabled={processing}>
\${indentStr}                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
\${indentStr}                APPROVE PAYROLL
\${indentStr}            </button>
\${indentStr}            <button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>
\${indentStr}                Return to HR
\${indentStr}            </button>
\${indentStr}        </>
\${indentStr}    )}

\${indentStr}\`;
        
        content = content.substring(0, commentIndex) + branchBlock + content.substring(commentIndex);
        
        // Also update the Operations Manager "Return to HR" to "Return to Branch Manager"
        const returnHROpsStr = \`<button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>\\n\${indentStr}                                                        Return to HR\\n\${indentStr}                                                    </button>\`;
        
        // Since we injected Branch Manager, let's just find the NEXT "Return to HR" after the Operations Manager block
        const startSearchFrom = content.indexOf(targetStr, commentIndex);
        
        // Use regex for flexible whitespace matching
        const returnHRRegex = /Return to HR\\s*<\\/button>/;
        const match = content.substring(startSearchFrom).match(returnHRRegex);
        if (match) {
            const absoluteIndex = startSearchFrom + match.index;
            content = content.substring(0, absoluteIndex) + "Return to Branch Manager</button>" + content.substring(absoluteIndex + match[0].length);
        }
        
        fs.writeFileSync(targetPath, content, 'utf8');
        console.log("Success frontend edit using index splicing.");
    } else {
        console.log("Could not find Operations Manager comment.");
    }
} else {
    console.log("Could not find Operations Manager condition.");
}
