const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/payroll/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Role filters (around line 78)
content = content.replace(
    /if \(data\.user\.role === 'Operations Manager'\) \{/,
    `if (data.user.role === 'Manager') {
                    setFilters(prev => ({ ...prev, status: 'Under Review - Branch Manager' }));
                }

                if (data.user.role === 'Operations Manager') {`
);

// 2. Select options
content = content.replace(
    /<option value="Under Review - Operations Manager">For Ops Review<\/option>/,
    `<option value="Under Review - Branch Manager">For Branch Manager Review</option>
                                    <option value="Under Review - Operations Manager">For Ops Review</option>`
);

// 3. Status style
content = content.replace(
    /if \(s\.includes\('operations'\)\) return \{ bg: '#ffedd5', text: '#9a3412', dot: '#f97316' \}; \/\/ Orange \(Ops\)/,
    `if (s.includes('branch manager')) return { bg: '#e0e7ff', text: '#4338ca', dot: '#6366f1' }; // Indigo (Branch Manager)
        if (s.includes('operations')) return { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' }; // Orange (Ops)`
);

// 4. Display status
content = content.replace(
    /else if \(s === 'under review - operations manager'\) displayStatus = 'For Operations Manager Approval';/,
    `else if (s === 'under review - branch manager') displayStatus = 'For Branch Manager Approval';
                                    else if (s === 'under review - operations manager') displayStatus = 'For Operations Manager Approval';`
);

// Add 'branch manager' to actionable conditions
content = content.replace(
    /s\.includes\('review'\) \|\| s\.includes\('operations'\)/,
    `s.includes('review') || s.includes('operations') || s.includes('branch manager')`
);

// Also update the action button check where s.includes('operations')
// Wait, the original was: s.includes('review') || s.includes('operations') || s.includes('vice president') || s === 'for release' 
// It already includes('review'), so 'under review - branch manager' will match.

content = content.replace(/branch manager\)/g, "branch manager')"); // Fix potential typo if any, just to be safe. Actually not needed.

fs.writeFileSync(targetFile, content);
console.log('Masterlist script patched successfully');
