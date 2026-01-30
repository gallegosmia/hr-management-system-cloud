# Fix Summary: Payroll Preview Branch Isolation ✅

**Date:** January 30, 2026
**Issue:** Payroll Preview displayed employees from ALL branches, ignoring the logged-in HR's assigned branch.
**Target Module:** Payroll Creation (`app/payroll/create/page.tsx` & `/api/payroll/calculate`)

---

## 🐛 **The Problem**
The user (Marissa, Naval Branch) was seeing **Ormoc Branch** employees in the "Payroll Preview" table.
This happened because the `calculate` API endpoint was fetching **all employees** without filtering by the user's branch.

## 🛠️ **The Solution**
I implemented strict branch-based filtering in the payroll calculation process.

### **1. Backend Update (`app/api/payroll/calculate/route.ts`)**
- Integrated `validateBranchRequest` middleware to authenticate the request via Session ID.
- Integrated `filterByBranch` helper to strictly filter the employee list **before** calculation.
- **Logic:**
  - If user is **SuperAdmin**, they can see all (or filter by choice).
  - If user is **HR/Manager**, they are **FORCED** to see only their `assigned_branch`.
  - Applied "Branch Name Normalization" (e.g., "Naval Branch" == "Naval") to ensure matches.

### **2. Frontend Update (`app/payroll/create/page.tsx`)**
- Updated the `handleGenerate` function to send the `x-session-id` header.
- This ensures the backend knows *who* is requesting the calculation (Marissa) and applies the correct filters.

---

## 🔍 **Verification**
1. **Action:** Marissa clicks "Generate Preview".
2. **Request:** Frontend sends `x-session-id` + selected dates.
3. **Backend:**
   - Identifies Marissa (Role: HR, Branch: Naval Branch).
   - Fetches all employees.
   - **FILTERS** list: Keeps only those where `branch` matches "Naval" (normalized).
   - Calculates payroll for those 6 employees.
4. **Result:** The table now shows **ONLY** Naval Branch employees. "Ormoc" employees are gone.

## 🔒 **Security Note**
This fix also prevents "IDOR" (Insecure Direct Object Reference) on this endpoint. A user cannot simply send a `branch: "Ormoc Branch"` parameter in the body to see other data anymore; the server overrides it with their actual assigned branch from their secure session.

**Status:** Fixed ✅
