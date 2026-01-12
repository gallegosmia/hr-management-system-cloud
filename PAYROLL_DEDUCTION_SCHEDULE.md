# Payroll Deduction Schedule

## Overview
The HR Management System automatically applies deductions based on the payroll cutoff date. This ensures compliance with company policy and government regulations.

## Cutoff Dates

### 15th Cutoff (10th to 15th of the month)
**Default Deductions Applied:**
1. **PhilHealth Contribution** - Government health insurance
2. **Pag-IBIG Contribution** - Government housing fund
3. **Pag-IBIG Loan** - Housing loan amortization
4. **Company Loan** - Internal company loan payments
5. **Company Savings** - Employee savings program
6. **Cash Advance** - Salary advance deductions
7. **Other Deductions** - Miscellaneous deductions

### 30th Cutoff (25th to 5th of the month)
**Default Deductions Applied:**
1. **SSS Contribution** - Social Security System
2. **SSS Loan** - SSS loan amortization
3. **Company Loan** - Internal company loan payments
4. **Cash Advance** - Salary advance deductions
5. **Other Deductions** - Miscellaneous deductions

## Deduction Distribution Logic

### Government Contributions
- **SSS**: Deducted on 30th cutoff only
- **PhilHealth**: Deducted on 15th cutoff only
- **Pag-IBIG**: Deducted on 15th cutoff only

### Loan Amortizations
- **SSS Loan**: Deducted on 30th cutoff only
- **Pag-IBIG Loan**: Deducted on 15th cutoff only
- **Company Loan**: Deducted on BOTH 15th and 30th cutoffs

### Other Deductions
- **Company Savings**: Deducted on 15th cutoff only
- **Cash Advance**: Deducted on BOTH 15th and 30th cutoffs
- **Other Deductions**: Deducted on BOTH 15th and 30th cutoffs

## Manual Override

While the system applies default deductions automatically, HR can manually select which deductions to apply when generating payroll:

1. Go to **Payroll** > **New Payroll Run**
2. Select the period dates
3. The system will auto-detect the cutoff (15th or 30th)
4. Default deductions will be pre-selected
5. You can manually check/uncheck deductions as needed
6. Click **Generate Preview** to calculate

## Implementation Details

### Automatic Detection
The system determines the cutoff type based on the end date:
- **15th Cutoff**: End date is between the 10th and 15th
- **30th Cutoff**: End date is between the 25th and 5th (of next month)

### Code Location
File: `app/api/payroll/calculate/route.ts`

```typescript
// 15th Cutoff Detection
const is15th = day >= 10 && day <= 15;

// 30th Cutoff Detection
const isEnd = day >= 25 || day <= 5;
```

## Benefits

1. **Compliance**: Ensures government contributions are deducted correctly
2. **Consistency**: Same deductions applied every cutoff
3. **Flexibility**: Can override defaults when needed
4. **Accuracy**: Reduces human error in payroll processing
5. **Transparency**: Clear documentation of deduction schedule

## Example Scenarios

### Scenario 1: Regular 15th Cutoff
- **Period**: January 1-15, 2026
- **Auto-Applied**: PhilHealth, Pag-IBIG, Pag-IBIG Loan, Company Loan, Company Savings, Cash Advance, Other Deductions
- **Not Applied**: SSS, SSS Loan

### Scenario 2: Regular 30th Cutoff
- **Period**: January 16-31, 2026
- **Auto-Applied**: SSS, SSS Loan, Company Loan, Cash Advance, Other Deductions
- **Not Applied**: PhilHealth, Pag-IBIG, Pag-IBIG Loan, Company Savings

### Scenario 3: Manual Override
- **Period**: January 1-15, 2026
- **Default**: 15th cutoff deductions
- **Override**: HR can manually add SSS if needed for special cases

## Notes

- Company Loan appears in both cutoffs to allow for bi-monthly payments
- Cash Advance and Other Deductions are flexible and can be applied in both cutoffs
- The system will only deduct if the employee has a balance/amount configured
- Zero-balance loans will not appear in the deduction breakdown

## Date Implemented
January 8, 2026
