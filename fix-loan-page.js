const fs = require('fs');
let content = fs.readFileSync('app/loans/new/page.tsx', 'utf8');

// 1. Fix fetchEmployees to filter active
content = content.replace(
    /setEmployees\(Array\.isArray\(data\) \? data : \[\]\);/g,
    "setEmployees(Array.isArray(data) ? data.filter((emp: any) => !['Resigned', 'Terminated', 'AWOL'].includes(emp.employment_status)) : []);"
);

// 2. Fix the Current Balance rendering
content = content.replace(
    /<span style=\{\{\s*fontSize: '0\.875rem',\s*fontWeight: 800,\s*color: '#ef4444'\s*\}\}>- ₱\{eligibility\.currentBalance\.toLocaleString\(\)\}<\/span>/g,
    "<span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748b' }}>₱{eligibility.currentBalance.toLocaleString()}</span>"
);

fs.writeFileSync('app/loans/new/page.tsx', content);
console.log('Loan page updated successfully.');
