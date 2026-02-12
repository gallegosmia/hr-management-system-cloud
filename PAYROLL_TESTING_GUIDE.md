# Payroll Module - Testing Guide

## 🎯 Test Overview

This guide will help you test the newly implemented Payroll Module. The module is **pay-based** (NOT attendance-based) with editable payroll days and cutoff-dependent deductions.

---

## ⚠️ Prerequisites

### Database Migration Required

Before testing, you need to run the database migration to create the new payroll tables.

**Option 1: Using Cloud Database (Recommended)**
```bash
# Make sure DATABASE_URL is set in your environment
node migrations/run-payroll-migration.js
```

**Option 2: Using Local PostgreSQL**
```bash
# Start PostgreSQL service first
# Then run migration
node migrations/run-payroll-migration.js
```

**Option 3: Manual SQL Execution**
```sql
-- Connect to your database and run:
-- migrations/payroll_migration.sql
```

---

## 🧪 Test Scenarios

### Test 1: Access Payroll List Page

**URL**: `http://localhost:3001/payroll`

**Expected Result**:
- ✅ Page loads without errors
- ✅ Compact design (fits 1366×768 screen)
- ✅ Header shows "Payroll Management"
- ✅ Filters visible: Branch, Status, Search
- ✅ "Create Payroll" button visible (for authorized users)
- ✅ Table shows columns: Run Number, Branch, Period, Cutoff, Employees, Total Net Pay, Status, Actions

**Check Console**: No JavaScript errors

---

### Test 2: Create New Payroll Run

**Steps**:
1. Click "Create Payroll" button
2. **Step 1**: Select Branch (Ormoc or Naval)
3. **Step 2**: Select Period
   - Start Date: `2026-02-01`
   - End Date: `2026-02-15`
4. **Step 3**: Select Cutoff Day
   - Choose `15th` (should show: PHIC, Pag-IBIG, etc.)
   - OR choose `30th` (should show: SSS, SSS Loan, etc.)
5. **Step 4**: Select Employees
   - Choose "All active employees"
   - OR select specific employees
6. **Step 5**: Review & Confirm
   - Verify all details are correct
7. Click "Create Payroll Run"

**Expected Result**:
- ✅ Progress bar shows current step
- ✅ Each step validates before proceeding
- ✅ Review page shows all selections
- ✅ Success message: "Payroll run created successfully! X payslips generated."
- ✅ Redirects to payroll run details page

---

### Test 3: View Payroll Run Details

**URL**: `http://localhost:3001/payroll/[id]`

**Expected Result**:
- ✅ Page loads with payroll run information
- ✅ Summary cards show: Total Employees, Total Gross Pay, Total Deductions, Total Net Pay
- ✅ Table shows all employees with payslips
- ✅ Columns match cutoff day:
  - **15th**: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds, Company Loan, Cash Advance, Other
  - **30th**: SSS, SSS Loan, Company Loan, Cash Advance, Other
- ✅ Payroll Days column is editable (default: 15.00)
- ✅ Action buttons: Approve, Lock, Export (based on status)

---

### Test 4: Edit Payroll Days

**Steps**:
1. On payroll run details page
2. Click on a payroll days cell
3. Change value (e.g., from 15.00 to 13.50)
4. Press Enter or click outside

**Expected Result**:
- ✅ Value updates
- ✅ Basic Pay recalculates automatically
- ✅ Gross Pay recalculates automatically
- ✅ Net Pay recalculates automatically
- ✅ Changes save to database

**Validation**:
- ❌ Cannot exceed period days (should show error)
- ❌ Cannot be zero or negative (should show error)

---

### Test 5: Approve Payroll

**Steps**:
1. On payroll run details page (status: Draft)
2. Click "Approve" button
3. Confirm approval

**Expected Result**:
- ✅ Status changes to "Approved"
- ✅ Approve button disappears
- ✅ Lock button appears
- ✅ Audit log records approval

**Permissions**:
- ✅ Only Super Admin, President, VP can approve
- ❌ HR cannot approve

---

### Test 6: Lock Payroll

**Steps**:
1. On payroll run details page (status: Approved)
2. Click "Lock" button
3. Confirm lock

**Expected Result**:
- ✅ Status changes to "Locked"
- ✅ All editing disabled
- ✅ Cannot modify payroll days
- ✅ Cannot modify deductions
- ✅ Cannot delete payroll

---

### Test 7: Branch Access Control

**Test as HR User (Ormoc)**:
- ✅ Can only see Ormoc payroll runs
- ❌ Cannot see Naval payroll runs
- ❌ Cannot select "All" branches

**Test as Super Admin**:
- ✅ Can see all branches
- ✅ Can select any branch
- ✅ Can create payroll for any branch

---

### Test 8: Cutoff-Dependent Deductions

**15th Cutoff Payroll**:
- ✅ Shows: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds
- ❌ Does NOT show: SSS, SSS Loan

**30th Cutoff Payroll**:
- ✅ Shows: SSS, SSS Loan
- ❌ Does NOT show: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds

**Both Cutoffs**:
- ✅ Shows: Company Loan, Cash Advance, Other Deductions

---

### Test 9: Payroll Computation Accuracy

**Test Case**:
- Monthly Salary: ₱15,000.00
- Payroll Days: 15.00
- Regular Allowance: ₱500.00
- PHIC Deduction: ₱281.25

**Expected Calculation**:
```
Daily Rate = 15,000 / 30 = ₱500.00
Basic Pay = 500 × 15 = ₱7,500.00
Gross Pay = 7,500 + 500 = ₱8,000.00
Total Deductions = 281.25
Net Pay = 8,000 - 281.25 = ₱7,718.75
```

**Verify**:
- ✅ Daily Rate = ₱500.00
- ✅ Basic Pay = ₱7,500.00
- ✅ Gross Pay = ₱8,000.00
- ✅ Net Pay = ₱7,718.75

---

### Test 10: Compact Sizing (1366×768)

**Screen Resolution**: Set browser to 1366×768

**Expected Result**:
- ✅ Payroll list page fits without vertical scrolling
- ✅ Table rows are compact (36px height)
- ✅ Filters are compact (32px height)
- ✅ Buttons are compact (32px height)
- ✅ Font sizes are readable (minimum 10.4px)
- ✅ No horizontal scrolling on main content

---

## 🐛 Common Issues & Solutions

### Issue 1: "Payroll run not found"
**Solution**: Run database migration first

### Issue 2: "Access denied"
**Solution**: Check user role and branch assignment

### Issue 3: "Cannot edit locked payroll"
**Solution**: This is expected behavior. Locked payrolls are read-only.

### Issue 4: Database connection error
**Solution**: 
- Check DATABASE_URL environment variable
- Ensure PostgreSQL is running
- Verify database credentials

### Issue 5: API returns 401 Unauthorized
**Solution**: 
- Ensure you're logged in
- Check session validity
- Try logging out and back in

---

## 📊 API Endpoints to Test

### 1. List Payroll Runs
```
GET /api/payroll/runs?branch=Ormoc&status=draft
```

**Expected Response**:
```json
{
  "runs": [
    {
      "id": 1,
      "run_number": "ORMOC-202602-15-001",
      "branch": "Ormoc",
      "status": "draft",
      "employee_count": 25,
      "total_net_pay": 187500.00
    }
  ],
  "total": 1
}
```

### 2. Create Payroll Run
```
POST /api/payroll/runs
Content-Type: application/json

{
  "branch": "Ormoc",
  "periodStart": "2026-02-01",
  "periodEnd": "2026-02-15",
  "cutoffDay": 15
}
```

**Expected Response**:
```json
{
  "success": true,
  "payrollRun": { ... },
  "payslipsCreated": 25
}
```

### 3. Get Payroll Run Details
```
GET /api/payroll/runs/1
```

**Expected Response**:
```json
{
  "payrollRun": { ... },
  "payslips": [ ... ]
}
```

### 4. Update Payslip
```
PATCH /api/payroll/runs/1/payslips/1
Content-Type: application/json

{
  "payrollDays": 13.5,
  "deductions": {
    "phic": 281.25,
    "pagibig": 200.00
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "payslip": { ... }
}
```

### 5. Approve Payroll
```
PATCH /api/payroll/runs/1
Content-Type: application/json

{
  "action": "approve"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Payroll approved"
}
```

---

## ✅ Verification Checklist

### Database
- [ ] Migration ran successfully
- [ ] Tables created: `payroll_runs`, `payslips`, `payroll_audit_log`
- [ ] Indexes created
- [ ] Views created
- [ ] Triggers active

### Backend
- [ ] API routes respond correctly
- [ ] Access control enforced
- [ ] Payroll computation accurate
- [ ] Cutoff deductions filtered correctly
- [ ] Audit logging works

### Frontend
- [ ] Payroll list page loads
- [ ] Create wizard works (all 5 steps)
- [ ] Payroll details page loads
- [ ] Editable payroll days work
- [ ] Approve/Lock buttons work
- [ ] Compact sizing applied

### Business Logic
- [ ] Pay-based computation (NO attendance)
- [ ] Editable payroll days
- [ ] Default payroll days = 15
- [ ] Cutoff-dependent deductions
- [ ] Branch-based access control
- [ ] Approval workflow (draft → approved → locked)

### Security
- [ ] Branch access enforced
- [ ] Role-based permissions work
- [ ] Cannot edit locked payroll
- [ ] Cannot delete approved payroll
- [ ] Audit trail complete

---

## 🎬 Next Steps After Testing

1. **If tests pass**: Proceed to Phase 4 (Payslip Design)
2. **If tests fail**: Report errors for debugging
3. **Database migration**: Must be run before any testing

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1: Payroll List Page         [ PASS / FAIL ]
Test 2: Create Payroll Run         [ PASS / FAIL ]
Test 3: View Payroll Details       [ PASS / FAIL ]
Test 4: Edit Payroll Days          [ PASS / FAIL ]
Test 5: Approve Payroll            [ PASS / FAIL ]
Test 6: Lock Payroll               [ PASS / FAIL ]
Test 7: Branch Access Control      [ PASS / FAIL ]
Test 8: Cutoff Deductions          [ PASS / FAIL ]
Test 9: Computation Accuracy       [ PASS / FAIL ]
Test 10: Compact Sizing            [ PASS / FAIL ]

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: [ PASS / FAIL ]
```

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check server logs
3. Verify database connection
4. Ensure migration ran successfully
5. Check user permissions

**Database Migration Command**:
```bash
node migrations/run-payroll-migration.js
```

**Start Dev Server**:
```bash
npm run dev
```

**Access Application**:
```
http://localhost:3001/payroll
```
