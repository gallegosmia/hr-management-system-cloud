# Payroll Module - Manual Testing Guide

## 🎯 Quick Test Checklist

### ✅ Pre-Test Setup
1. **Database Migration** (REQUIRED - Run this first!)
   ```bash
   node migrations/run-payroll-migration.js
   ```
   - This creates all payroll tables and functions
   - Only needs to be run once

2. **Verify Server is Running**
   - Server should be running on `http://localhost:3001`
   - Check for any build errors in the terminal

---

## 📋 Test Scenarios

### Test 1: Navigation & Access Control ✨
**Objective**: Verify payroll menu appears and access control works

**Steps**:
1. Open `http://localhost:3001` in your browser
2. Login with admin credentials
3. Look for **"Payroll"** in the sidebar (💰 icon)
4. Click on "Payroll"

**Expected Results**:
- ✅ Payroll menu item visible in sidebar
- ✅ Clicking opens `/payroll` page
- ✅ Page loads without errors
- ✅ Branch filter shows (if Super Admin/President/VP)
- ✅ Status filter shows (Draft, Approved, Locked)

---

### Test 2: Payroll List Page 📊
**Objective**: Verify payroll runs display correctly

**Steps**:
1. On the payroll list page, observe the layout
2. Check for filters and search box
3. Look for "Create Payroll" button

**Expected Results**:
- ✅ Clean, compact layout (optimized for 1366×768)
- ✅ Branch filter dropdown (Super Admin/Executives only)
- ✅ Status filter (Draft/Approved/Locked)
- ✅ Search box for run numbers
- ✅ Table shows: Run Number, Branch, Period, Cutoff, Employees, Net Pay, Status
- ✅ "Create Payroll" button visible (if authorized)

---

### Test 3: Create Payroll Wizard 🧙‍♂️
**Objective**: Test the 5-step payroll creation process

**Steps**:
1. Click "Create Payroll" button
2. **Step 1 - Select Branch**:
   - Choose a branch (Ormoc, Naval, or Head Office)
   - Click "Next"
3. **Step 2 - Select Period**:
   - Choose start date and end date
   - Click "Next"
4. **Step 3 - Select Cutoff**:
   - Choose 15th or 30th cutoff
   - Click "Next"
5. **Step 4 - Select Employees**:
   - See list of active employees in selected branch
   - Select employees (or "Select All")
   - Click "Next"
6. **Step 5 - Review**:
   - Review all selections
   - Click "Create Payroll Run"

**Expected Results**:
- ✅ Progress indicator shows current step (1/5, 2/5, etc.)
- ✅ Each step validates before proceeding
- ✅ Employee list shows only active employees from selected branch
- ✅ Review page shows summary of all selections
- ✅ Success message after creation
- ✅ Redirects to payroll run details page

---

### Test 4: Payroll Run Details Page 📝
**Objective**: Verify payroll run details and editing features

**Steps**:
1. Click on any payroll run from the list
2. Observe the summary cards at the top
3. Look at the payslips table
4. Try clicking on a "Payroll Days" cell (if status is Draft)
5. Try editing the value
6. Click outside to save

**Expected Results**:
- ✅ Summary cards show: Total Employees, Total Gross Pay, Total Deductions, Total Net Pay
- ✅ Table shows all employee payslips
- ✅ Columns visible: Employee, Days, Basic Pay, Allowances, Gross Pay, Deductions, Net Pay
- ✅ **Deduction columns change based on cutoff**:
  - **15th Cutoff**: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds, Company Loan, Cash Advance, Other
  - **30th Cutoff**: SSS, SSS Loan, Company Loan, Cash Advance, Other
- ✅ Payroll Days are editable (click to edit)
- ✅ Values recompute automatically after editing
- ✅ "Approve" button visible (if Draft and authorized)
- ✅ "Lock" button visible (if Approved and authorized)

---

### Test 5: Pay-Based Computation 🧮
**Objective**: Verify payroll calculations are correct (NO attendance)

**Test Case**: Employee with ₱15,000 monthly salary
- **Expected Daily Rate**: ₱15,000 ÷ 30 = ₱500.00
- **Expected Basic Pay (15 days)**: ₱500 × 15 = ₱7,500.00
- **Expected Basic Pay (14 days)**: ₱500 × 14 = ₱7,000.00

**Steps**:
1. Find an employee with known monthly salary
2. Check their daily rate in the table
3. Verify basic pay = daily rate × payroll days
4. Edit payroll days to 14
5. Verify basic pay recalculates correctly

**Expected Results**:
- ✅ Daily Rate = Monthly Salary ÷ 30
- ✅ Basic Pay = Daily Rate × Payroll Days
- ✅ Gross Pay = Basic Pay + Allowances
- ✅ Net Pay = Gross Pay - Total Deductions
- ✅ **NO attendance data used in calculation**

---

### Test 6: Cutoff-Dependent Deductions 🔄
**Objective**: Verify deductions change based on cutoff

**Steps**:
1. Create a payroll with **15th cutoff**
2. Note the deduction columns (PHIC, Pag-IBIG, etc.)
3. Create another payroll with **30th cutoff**
4. Note the deduction columns (SSS, SSS Loan, etc.)

**Expected Results**:
- ✅ **15th Cutoff Shows**: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds
- ✅ **30th Cutoff Shows**: SSS, SSS Loan
- ✅ **Both Show**: Company Loan, Cash Advance, Other Deductions
- ✅ Deduction columns are dynamic (not all shown at once)

---

### Test 7: Individual Payslip View 🧾
**Objective**: Test premium payslip design and print functionality

**Steps**:
1. From payroll run details, click "View" on any employee
2. Observe the payslip design
3. Click "Print Payslip" button
4. Check print preview

**Expected Results**:
- ✅ Premium design with company logo
- ✅ Employee information section
- ✅ Earnings breakdown (Basic Pay, Allowances)
- ✅ Deductions breakdown (cutoff-dependent)
- ✅ **Take Home Pay** prominently displayed
- ✅ Signature section
- ✅ Print preview matches on-screen design
- ✅ Optimized for A4/Letter portrait

---

### Test 8: Approval Workflow 🔐
**Objective**: Test draft → approved → locked workflow

**Steps**:
1. Create a new payroll run (starts as Draft)
2. Click "Approve" button (if authorized)
3. Verify status changes to "Approved"
4. Click "Lock" button (if authorized)
5. Verify status changes to "Locked"
6. Try editing a locked payroll

**Expected Results**:
- ✅ New payrolls start as "Draft"
- ✅ Only authorized users see "Approve" button
- ✅ Approved payrolls show "Lock" button
- ✅ Locked payrolls cannot be edited
- ✅ Locked payrolls cannot be deleted
- ✅ Status badges show correct colors (gray/green/blue)

---

### Test 9: Branch Access Control 🔒
**Objective**: Verify branch-based permissions work

**Test as Super Admin/President/VP**:
- ✅ Can see "All Branches" option
- ✅ Can create payroll for any branch
- ✅ Can view all payroll runs

**Test as HR (assigned to specific branch)**:
- ✅ Cannot see "All Branches" option
- ✅ Can only create payroll for assigned branch
- ✅ Can only view payroll for assigned branch
- ✅ Branch selector is locked/read-only

---

### Test 10: Compact Sizing 📐
**Objective**: Verify UI fits on 1366×768 screens

**Steps**:
1. Resize browser window to 1366×768
2. Navigate through all payroll pages
3. Check for horizontal/vertical scrolling

**Expected Results**:
- ✅ Payroll list fits without excessive scrolling
- ✅ Creation wizard fits in viewport
- ✅ Payroll details page shows summary cards + table
- ✅ Table has horizontal scroll (expected for many columns)
- ✅ No layout breaking or overlapping elements

---

## 🐛 Common Issues & Solutions

### Issue: "Payroll" not in sidebar
**Solution**: Refresh browser (Ctrl+R or F5)

### Issue: "Module not found" errors
**Solution**: Build errors fixed - restart dev server

### Issue: "Table not found" errors
**Solution**: Run database migration first!
```bash
node migrations/run-payroll-migration.js
```

### Issue: Can't edit payroll days
**Possible Causes**:
- Payroll is locked (expected behavior)
- User doesn't have edit permissions
- Not clicking directly on the cell

### Issue: Wrong deduction columns showing
**Check**: Verify cutoff day (15th vs 30th) - this is expected behavior!

---

## ✅ Success Criteria

The Payroll Module is working correctly if:
1. ✅ Navigation to payroll works
2. ✅ Can create payroll runs through 5-step wizard
3. ✅ Payroll computation is **pay-based** (NO attendance)
4. ✅ Payroll days are **editable** (default: 15)
5. ✅ Deductions are **cutoff-dependent** (15th vs 30th)
6. ✅ Branch access control works
7. ✅ Approval workflow works (draft → approved → locked)
8. ✅ Payslips display correctly and print well
9. ✅ UI is compact and fits 1366×768 screens
10. ✅ No build or runtime errors

---

## 📸 Screenshots to Capture

For documentation purposes, capture:
1. Payroll list page
2. Creation wizard (all 5 steps)
3. Payroll run details page
4. Individual payslip view
5. Print preview of payslip

---

## 🎉 What to Test Next

After basic testing:
- Test with real employee data
- Verify calculations with different salary amounts
- Test edge cases (0 days, 30 days, etc.)
- Test concurrent editing
- Test with different user roles
- Generate PDF reports (when implemented)

---

**Need Help?** Check the following files:
- `PAYROLL_PROGRESS_REPORT.md` - Implementation details
- `walkthrough.md` - Technical walkthrough
- `task.md` - Task checklist
