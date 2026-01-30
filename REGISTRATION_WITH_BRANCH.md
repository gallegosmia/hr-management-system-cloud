# Registration with Branch Assignment - Implementation Complete ✅

## What Was Added

### 1. Registration API Updates ✅
**File:** `app/api/auth/register/route.ts`

**New Features:**
- ✅ Accepts `assigned_branch` parameter
- ✅ Validates branch requirement based on role:
  - **HR users:** MUST select a branch (Naval or Ormoc) ⚠️
  - **Employees:** Optional branch assignment
  - **Super Admins:** Cannot have specific branch (auto-set to NULL)
- ✅ Sets HR approval status based on role:
  - HR → PENDING (needs Super Admin approval)
  - Employee → NULL (regular account approval)
  - President/VP → NULL (security review)
- ✅ Simplified to 3-role system (Employee, HR, President/VP)
- ✅ Returns branch assignment in response

**Validation Rules:**
```typescript
// HR users MUST have a branch
if (role === 'HR' && !assigned_branch) {
    return error('HR users must have an assigned branch');
}

// Super Admins CANNOT have a specific branch
if (role === 'President'  && assigned_branch) {
    return error('Super Admin cannot be assigned to specific branch');
}

// Valid branches: Naval, Ormoc, Naval Branch, Ormoc Branch
```

### 2. Registration Page Updates ✅
**File:** `app/register/page.tsx`

**New UI Elements:**
1. **Updated Role Dropdown:**
   - Employee
   - HR Officer
   - President (Super Admin)
   - Vice President (Super Admin)

2. **New: Assigned Branch Dropdown** (Conditional)
   - Shows only for HR and Employee roles
   - Required for HR roles (marked with red *)
   - Optional for Employees
   - Hidden for Super Admins

3. **Dynamic Help Text:**
   - HR role: "⚠️ HR role requires Super Admin approval"
   - Super Admin: "⚠️ Super Admin roles require security review"
   - Employee: "ℹ️ Employee role has limited system access"

4. **Branch Selection Help:**
   - HR: "⚠️ Required: You will only access employees from this branch"
   - Employee: "ℹ️ Optional: Your home branch location"

5. **Super Admin Warning Box:**
   Shows golden warning when Super Admin role is selected:
   > 👑 Super Admin Access  
   > Super Admins have access to ALL branches and ALL modules. This role requires security review and manual approval.

---

## How It Works Now

### Registration Flow:

#### For HR User:
1. User fills out registration form
2. Selects "HR Officer" role
3. **MUST select branch** (Naval or Ormoc)
4. Submits form
5. Account created with:
   - `role` = 'HR'
   - `assigned_branch` = 'Naval' or 'Ormoc'
   - `hr_approval_status` = 'PENDING'
   - `is_active` = 0
6. Receives message: "Your HR access is pending Super Admin approval"
7. **Cannot login** until Super Admin approves

#### For Employee:
1. User fills out registration form
2. Selects "Employee" role
3. **Optionally** selects branch
4. Submits form
5. Account created with:
   - `role` = 'Employee'
   - `assigned_branch` = 'Naval'/'Ormoc' or NULL
   - `hr_approval_status` = NULL (not needed)
   - `is_active` = 0
6. Receives message: "Your account is pending admin approval"
7. Can login after general account approval

#### For Super Admin (President/VP):
1. User fills out registration form
2. Selects "President" or "Vice President"
3. Branch dropdown **hidden** (not applicable)
4. Submits form
5. Account created with:
   - `role` = 'President' or 'Vice President'
   - `assigned_branch` = NULL (all branches)
   - `hr_approval_status` = NULL (not needed)
   - `is_active` = 0
6. Receives message: "Your Super Admin access is pending security review"
7. Requires manual approval for security

---

## Branch Assignment Rules

| Role | Branch Required? | Default Value | Access Scope |
|------|-----------------|---------------|--------------|
| **HR** | ✅ YES (Required) | User selects | Assigned branch ONLY |
| **Employee** | ⏳ Optional | User selects or NULL | Own data only |
| **President** | ❌ NO (Auto NULL) | NULL | ALL branches |
| **Vice President** | ❌ NO (Auto NULL) | NULL | ALL branches |

---

## API Request Example

### HR Registration:
```json
{
    "username": "hr_naval",
    "email": "hr@melanninvestor.com",
    "password": "SecurePass123",
    "role": "HR",
    "assigned_branch": "Naval"
}
```

### Employee Registration:
```json
{
    "username": "employee1",
    "email": "employee@melanninvestor.com",
    "password": "Password123",
    "role": "Employee",
    "assigned_branch": "Ormoc"
}
```

### Super Admin Registration:
```json
{
    "username": "admin",
    "email": "admin@melanninvestor.com",
    "password": "SuperSecure123",
    "role": "President",
    "assigned_branch": null
}
```

---

## Success Response

```json
{
    "success": true,
    "message": "Registration successful! Your HR access is pending Super Admin approval.",
    "user": {
        "id": 5,
        "username": "hr_naval",
        "role": "HR",
        "assigned_branch": "Naval",
        "hr_approval_status": "PENDING"
    }
}
```

---

## Error Responses

### HR without branch:
```json
{
    "error": "HR users must have an assigned branch (Naval or Ormoc)"
}
```

### Invalid branch:
```json
{
    "error": "Invalid branch. Valid branches: Naval, Ormoc"
}
```

### Super Admin with branch:
```json
{
    "error": "Super Admin roles cannot be assigned to a specific branch"
}
```

---

## Testing the Feature

### Test 1: Register as HR User
1. Go to `/register`
2. Fill out form
3. Select "HR Officer" role
4. **Notice:** Branch dropdown appears with required asterisk (*)
5. Select "Naval Branch"
6. Submit
7. **Expected:** Success message with pending approval notice

### Test 2: Register as Employee
1. Go to `/register`
2. Select "Employee" role
3. **Notice:** Branch dropdown appears (optional)
4. Can select branch or leave blank
5. Submit
6. **Expected:** Success message

### Test 3: Register as Super Admin
1. Go to `/register`
2. Select "President (Super Admin)"
3. **Notice:** Golden warning box appears
4. **Notice:** Branch dropdown hidden
5. Submit
6. **Expected:** Success with security review message

---

## Database After Registration

### New HR User:
```sql
INSERT INTO users (username, email, password, role, assigned_branch, hr_approval_status, is_active, status)
VALUES ('hr_naval', 'hr@example.com', '[hashed]', 'HR', 'Naval', 'PENDING', 0, 'PENDING_HR_APPROVAL');
```

### New Employee:
```sql
INSERT INTO users (username, email, password, role, assigned_branch, hr_approval_status, is_active, status)
VALUES ('emp1', 'emp@example.com', '[hashed]', 'Employee', 'Ormoc', NULL, 0, 'PENDING_APPROVAL');
```

### New Super Admin:
```sql
INSERT INTO users (username, email, password, role, assigned_branch, hr_approval_status, is_active, status)
VALUES ('superadmin2', 'admin@example.com', '[hashed]', 'President', NULL, NULL, 0, 'PENDING_SUPERADMIN_APPROVAL');
```

---

## What's Next?

✅ **DONE:** Registration with branch assignment  
✅ **DONE:** Branch validation in API  
✅ **DONE:** Conditional UI based on role  

⏳ **PENDING:**
- HR Approval UI (for existing Super Admin to approve new HR users)
- Enhanced Login UI (role/branch selection at login)
- User Management (Super Admin assigns branches to existing users)

---

**Status:** Registration Complete ✅  
**Branch Assignment:** Fully Functional ✅  
**Role Validation:** Active ✅  
**HR Approval Workflow:** Database Ready, UI Pending 🚧
