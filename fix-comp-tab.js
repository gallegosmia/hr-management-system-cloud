const fs = require('fs');
let content = fs.readFileSync('components/employee/CompensationTab.tsx', 'utf8');

// The field gets its value from:
// { key: 'company_loan_balance', label: 'Company Loan Balance' },

// We need to change the map logic so that 'company_loan_balance' reads from employee.ledger_balance and is readOnly

content = content.replace(
    /(<input\s+type="number"\s+value=\{\(salaryInfo\.deductions as any\)\?\.\[key\] \|\| 0\}\s+)onChange/m,
    `$1disabled={key === 'company_loan_balance'}
                                        readOnly={key === 'company_loan_balance'}
                                        onChange`
);

content = content.replace(
    /(<input[\s\S]*?className="[\s\S]*?)backgroundColor: key === 'company_funds' \? '#f3f4f6' : 'white'/m, // wait, there's no className.
    ''
);

// Better to replace the whole map block for common deductions
const commonDeductionsRegex = /\{\[\s*\{\s*key:\s*'company_loan',\s*label:\s*'Company Loan \(Deduction\)'\s*\},[\s\S]*?\}\)\}/m;

const replacementMap = `{[
                            { key: 'company_loan', label: 'Company Loan (Deduction)' },
                            { key: 'company_loan_balance', label: 'Company Loan Balance' },
                            { key: 'cash_advance', label: 'Cash Advance' }
                        ].map(({ key, label }) => (
                            <div key={key} style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                    {label}
                                </label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={key === 'company_loan_balance' ? (employee?.ledger_balance || 0) : ((salaryInfo.deductions as any)?.[key] || 0)}
                                        disabled={key === 'company_loan_balance'}
                                        readOnly={key === 'company_loan_balance'}
                                        onChange={(e) => {
                                            if (key === 'company_loan_balance') return;
                                            setSalaryInfo({
                                                ...salaryInfo,
                                                deductions: {
                                                    ...salaryInfo.deductions,
                                                    [key]: parseFloat(e.target.value) || 0
                                                }
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: key === 'company_loan_balance' ? '#f3f4f6' : 'white',
                                            color: key === 'company_loan_balance' ? '#9ca3af' : 'inherit',
                                            cursor: key === 'company_loan_balance' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#ef4444' }}>
                                        {formatCurrency(key === 'company_loan_balance' ? (employee?.ledger_balance || 0) : ((salaryInfo.deductions as any)?.[key] || 0))}
                                    </div>
                                )}
                            </div>
                        ))}`;

content = content.replace(commonDeductionsRegex, replacementMap);

fs.writeFileSync('components/employee/CompensationTab.tsx', content);
console.log('CompensationTab updated successfully.');
