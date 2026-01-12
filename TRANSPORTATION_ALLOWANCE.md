# Transportation Allowance Feature

## Overview
The Transportation Allowance module allows HR to generate monthly transportation allowance acknowledgment forms for all active employees. Each employee receives ₱400.00 on the 10th of every month.

## Features

### 1. **Monthly Allowance Distribution**
- Fixed amount: ₱400.00 per employee
- Distribution date: 10th of every month
- Applies to all active employees (excludes Resigned and Terminated)

### 2. **PDF Form Generation**
The system generates a professional acknowledgment receipt form that includes:
- Company header (Melann HR Management System)
- Month and year of distribution
- Distribution date (10th of the month)
- Employee list with:
  - Sequential numbering
  - Full employee name
  - Employee ID
  - Position
  - Amount (₱400.00)
  - Signature line for acknowledgment
- Total amount calculation
- Prepared by and Approved by signature sections
- Note explaining the allowance purpose

### 3. **Print-Ready Format**
- Optimized for printing on standard paper
- Professional layout with proper spacing
- Signature lines for employee acknowledgment
- Date received column
- Authorization signatures at the bottom

## How to Use

### Generating Transportation Allowance Forms

1. **Navigate to Transportation Module**
   - Click on "🚗 Transportation" in the sidebar menu

2. **Select Period**
   - Choose the **Month** from the dropdown (January - December)
   - Choose the **Year** from the dropdown (shows current year ± 2 years)

3. **Review Employee List**
   - The system automatically displays all active employees
   - Shows employee name, position, department, and amount
   - Displays total number of employees and total amount

4. **Generate PDF Form**
   - Click the **"📄 Generate PDF Form"** button
   - The browser's print dialog will open
   - Choose your printer or "Save as PDF"
   - Print or save the acknowledgment form

5. **Distribute and Collect Signatures**
   - Print the form
   - Distribute ₱400.00 to each employee on the 10th
   - Have employees sign and date the form upon receipt
   - File the signed form for record-keeping

## Form Structure

### Header Section
- Company name: Melann HR Management System
- Document title: TRANSPORTATION ALLOWANCE ACKNOWLEDGMENT RECEIPT
- Month and year
- Distribution date

### Employee Table
| No. | Employee Name | Position | Amount | Signature / Date Received |
|-----|---------------|----------|--------|---------------------------|
| 1   | DELA CRUZ, JUAN S. | Manager | ₱400.00 | _________________ |
| ... | ... | ... | ... | ... |

### Footer Section
- Grand Total with employee count
- Prepared By: HR/Admin Officer (signature line)
- Approved By: General Manager / Owner (signature line)
- Note explaining the allowance purpose

## Business Rules

1. **Eligibility**
   - Only active employees receive the allowance
   - Resigned and Terminated employees are excluded
   - All employment statuses (Probationary, Regular, Contractual) are included if active

2. **Amount**
   - Fixed at ₱400.00 per employee per month
   - No variations based on position, department, or tenure

3. **Distribution Schedule**
   - Distributed on the 10th of every month
   - If the 10th falls on a weekend/holiday, distribute on the nearest working day

4. **Record Keeping**
   - Keep signed acknowledgment forms for audit purposes
   - File chronologically by month and year
   - Retain for the required period per company policy

## Integration with Payroll

**Note:** The transportation allowance is distributed separately from payroll and is NOT included in the payslip calculations. This is a cash allowance given directly to employees with a separate acknowledgment form.

If you want to include transportation allowance in the payroll:
1. Add it to the employee's "Other Allowances" field in their profile
2. It will then appear on their payslip under "Allowances"
3. Use the payroll system's existing PDF generation for payslips

## Tips

- **Monthly Routine**: Generate the form at the beginning of each month
- **Advance Preparation**: You can generate forms for future months in advance
- **Backup**: Save a PDF copy of each month's form digitally
- **Verification**: Cross-check the employee count with your active employee roster
- **Petty Cash**: Ensure petty cash fund has sufficient amount before distribution day

## Troubleshooting

**Q: An employee is missing from the list**
- Check if their employment status is set to "Resigned" or "Terminated"
- Verify the employee record exists in the 201 Files

**Q: The total amount seems incorrect**
- Verify the number of active employees
- Formula: Total = Number of Employees × ₱400.00

**Q: Print layout is not correct**
- Use the browser's print preview to check layout
- Ensure paper size is set to Letter or A4
- Check printer settings for margins

**Q: Need to modify the amount**
- Currently set to ₱400.00 per employee
- To change, modify the amount in `/app/transportation/page.tsx`

## Future Enhancements

Potential improvements for future versions:
- Variable amounts per employee based on distance/location
- Integration with payroll for automatic inclusion
- Digital signature collection
- Email distribution of acknowledgment forms
- Historical tracking and reporting
- Export to Excel for accounting
