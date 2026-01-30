# Enhanced Login & Access Control System - Implementation Plan

## Overview
This extends the branch-based access control with role/branch selection at login and HR approval workflow.

---

## NEW REQUIREMENTS SUMMARY

### 1. Login Form Enhancements
- ✅ Username/Password (existing)
- 🆕 **Role Dropdown** (required): Employee, HR
- 🆕 **Branch Dropdown** (required): Naval, Ormoc

### 2. Login Validation
- Selected Role + Branch must match user's account
- Store in session context
- Cannot change during active session

### 3. HR Role Access (Branch-Based)
- Access ALL modules (201, Attendance, Payroll, etc.)
- BUT only see employees from assigned branch
- STRICT branch filtering

### 4. Employee Role Access
- Limited modules (profile, own payslip, own attendance)
- Can ONLY see own data
- No admin/HR access

### 5. HR Approval Requirement (NEW)
- HR users need Super Admin approval
- Status: PENDING → APPROVED → ACTIVE
- Cannot access HR modules until approved
- Show pending message on login

### 6. Super Admin Approval Workflow
- Super Admin approves/rejects HR access
- Super Admin assigns branch authority
- Approval activates HR access

---

## ROLE DEFINITIONS (UPDATED)

### Super Admin (President, Vice President)
- Access: ALL branches
- Modules: ALL
- Approval: Not required
- Branch Filter: None (sees everything)

### HR (Admin, Manager) 
- Access: ASSIGNED branch ONLY
- Modules: ALL (201, Attendance, Payroll, Reports, etc.)
- Approval: **REQUIRED by Super Admin**
- Branch Filter: STRICT (only their branch)
- Status: PENDING → APPROVED → ACTIVE

### Employee
- Access: OWN data only
- Modules: Limited (Profile, Own Payslip, Own Attendance)
- Approval: Not required (auto-active)
- Branch Filter: Not applicable

---

## IMPLEMENTATION PHASES

### Phase 1: Database Schema Updates ✅ (DONE)
- ✅ `users.assigned_branch` 
- ✅ `sessions.selected_branch`
- ✅ `access_logs` table
- 🆕 **Add**: `users.hr_approval_status` (PENDING, APPROVED, REJECTED)
- 🆕 **Add**: `users.hr_approved_by` (super admin user_id)
- 🆕 **Add**: `users.hr_approved_at` (timestamp)

### Phase 2: Login UI Updates (NEW)
**File:** `app/page.tsx`

**Add to login form:**
1. Role Dropdown:
   ```tsx
   <select required>
     <option value="">Select Role</option>
     <option value="Employee">Employee</option>
     <option value="HR">HR / Admin</option>
   </select>
   ```

2. Branch Dropdown:
   ```tsx
   <select required>
     <option value="">Select Branch</option>
     <option value="Naval">Naval</option>
     <option value="Ormoc">Ormoc</option>
   </select>
   ```

3. Validation logic:
   - Check selected role matches `user.role` (Admin/Manager = HR, Employee = Employee)
   - Check selected branch matches `user.assigned_branch`
   - If HR role: Check `hr_approval_status === 'APPROVED'`

### Phase 3: Login API Updates
**File:** `app/api/auth/login/route.ts`

**Add validation:**
```typescript
// Verify role selection
if (selectedRole === 'HR') {
    // Must be Admin or Manager
    if (!['Admin', 'Manager'].includes(user.role)) {
        return error('Invalid role selection');
    }
    
    // Check HR approval status
    if (user.hr_approval_status !== 'APPROVED') {
        return error('Your HR access is pending Super Admin approval');
    }
}

// Verify branch selection
if (user.assigned_branch !== selectedBranch) {
    return error('Invalid branch selection');
}
```

### Phase 4: HR Approval Workflow (NEW)
**Create:** `app/api/admin/hr-approvals/route.ts`

**Endpoints:**
- `GET /api/admin/hr-approvals` - List pending HR requests
- `POST /api/admin/hr-approvals/approve` - Approve HR access
- `POST /api/admin/hr-approvals/reject` - Reject HR access

**Create:** `app/admin/hr-approvals/page.tsx`
- UI for Super Admin to view pending HR requests
- Approve/Reject buttons
- Show requester info, requested branch

### Phase 5: Registration Updates
**File:** `app/api/auth/register/route.ts`

**For HR role registration:**
```typescript
if (role === 'Admin' || role === 'Manager') {
    newUser.hr_approval_status = 'PENDING';
    newUser.is_active = 0; // Inactive until approved
    // Send notification to Super Admin
}
```

### Phase 6: Employee Role Access
**Update all modules to check user role:**
- If Employee: Only show own data
- Filter by `user.employee_id`

### Phase 7: Authorization Helper Updates
**File:** `lib/branch-access.ts`

**Add new functions:**
```typescript
function isHRRole(role: string): boolean {
    return ['Admin', 'Manager'].includes(role);
}

function isHRApproved(user: User): boolean {
    if (!isHRRole(user.role)) return true; // Non-HR don't need approval
    return user.hr_approval_status === 'APPROVED';
}

function canAccessHRModules(user: User): boolean {
    return isSuperAdmin(user.role) || 
           (isHRRole(user.role) && isHRApproved(user));
}
```

---

## IMPLEMENTATION CHECKLIST

### Database Changes
- [ ] Add `hr_approval_status` to users table
- [ ] Add `hr_approved_by` to users table  
- [ ] Add `hr_approved_at` to users table
- [ ] Create migration script

### Login System
- [ ] Add Role dropdown to login UI
- [ ] Add Branch dropdown to login UI
- [ ] Update login validation logic
- [ ] Show HR pending message
- [ ] Store role/branch in session

### HR Approval System
- [ ] Create HR approvals API endpoint
- [ ] Create HR approvals admin page
- [ ] Super Admin dashboard widget
- [ ] Email notification on approval/rejection

### Access Control
- [ ] Update employee endpoints for Employee role
- [ ] Update attendance endpoints for Employee role
- [ ] Update payroll endpoints for Employee role
- [ ] Block HR modules for unapproved HR users

### Testing
- [ ] Test Employee login (branch selection)
- [ ] Test HR login (pending approval message)
- [ ] Test HR login (approved, branch filtering)
- [ ] Test Super Admin (no restrictions)
- [ ] Test cross-branch access blocking

---

## VALIDATION RULES

**RULE 1:** HR user CANNOT access employees from another branch
**RULE 2:** HR user CANNOT access HR modules without approval
**RULE 3:** Employee user CANNOT access other employees' data
**RULE 4:** Branch selection at login MUST match user's assigned branch
**RULE 5:** Role selection at login MUST match user's role category

---

## FILES TO CREATE/MODIFY

### New Files:
1. `migrate_hr_approval.js` - Database migration
2. `app/api/admin/hr-approvals/route.ts` - Approval API
3. `app/admin/hr-approvals/page.tsx` - Approval UI
4. `lib/employee-access.ts` - Employee role helpers

### Modified Files:
1. `app/page.tsx` - Login form with dropdowns
2. `app/api/auth/login/route.ts` - Validation logic
3. `app/api/auth/register/route.ts` - HR pending status
4. `lib/auth.ts` - User interface updates
5. `lib/branch-access.ts` - Role helpers

---

**Next Step:** Start with database migration for HR approval fields.
