const fs = require('fs');
let content = fs.readFileSync('components/employee/CompensationTab.tsx', 'utf8');

const lines = content.split('\n');

// We want to remove lines 511 to 525 (indices 510 to 524)
// Let's first ensure these lines contain what we expect.
if (lines[510].includes('style={{') && lines[524].includes('))}')) {
    lines.splice(510, 15);
    fs.writeFileSync('components/employee/CompensationTab.tsx', lines.join('\n'));
    console.log('Successfully removed stray lines.');
} else {
    // Fallback: use regex to remove that specific chunk
    const target = /[ \t]*style=\{\{\n[ \t]*width: '100%',\n[ \t]*padding: '8px 12px',\n[ \t]*border: '1px solid #d1d5db',\n[ \t]*borderRadius: '6px',\n[ \t]*fontSize: '14px'\n[ \t]*\}\}\n[ \t]*\/>\n[ \t]*\) : \(\n[ \t]*<div style=\{\{ fontSize: '15px', fontWeight: 500, color: '#ef4444' \}\}>\n[ \t]*\{formatCurrency\(\(salaryInfo\.deductions as any\)\?\.\[key\] \|\| 0\)\}\n[ \t]*<\/div>\n[ \t]*\)\}\n[ \t]*<\/div>\n[ \t]*\}\)\}/;
    
    if (target.test(content)) {
        fs.writeFileSync('components/employee/CompensationTab.tsx', content.replace(target, ''));
        console.log('Successfully removed stray lines via regex.');
    } else {
        console.log('Could not find stray lines!');
    }
}
