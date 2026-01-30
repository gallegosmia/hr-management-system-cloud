# Branch-Based Access Control System - Implementation Plan

## Overview
This document outlines the implementation of a comprehensive branch-based access control system that ensures data isolation between branches (Naval, Ormoc) while allowing Super Admins full access.

## Implementation Status: 🔴 NOT STARTED

---

## Phase 1: Database Schema Updates

### 1.1 Update Users Table
**File:** `data/schema.sql` + Migration Script

**Changes Required:**
- Add `assigned_branch` column to `users` table
- Add `selected_branch` column to `sessions` table for runtime branch context

```sql
-- Migration: Add branch fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branch VARCHAR(100);

-- Migration: Add selected_branch to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS selected_branch VARCHAR(100);

-- Migration: Create access_logs table for security auditing
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    attempted_action TEXT NOT NULL,
    attempted_branch VARCHAR(100),
    user_branch VARCHAR(100),
    status VARCHAR(50), -- 'ALLOWED', 'DENIED'
    reason TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Update Role Definitions
**Current Roles:**
- Admin
- HR
- Manager
- Employee
- President
- Vice President

**New Role Mapping:**
- `SUPER ADMIN` = President OR Vice President (can access ALL branches)
- `ADMIN / BRANCH MANAGER` = Admin OR Manager (branch-restricted)
- `EMPLOYEE USER` = Employee OR HR (branch-restricted)

---

## Phase 2: Authentication & Session Management

### 2.1 Update Login Flow
**File:** `app/api/auth/login/route.ts`

**Changes:**
1. After successful password verification, check user's `assigned_branch`
2. If user is NOT a Super Admin, require branch selection
3. Store selected branch in SESSION
4. Validate that selected branch matches user's assigned branch (for non-Super Admins)

### 2.2 Update Session Structure
**File:** `lib/auth.ts`

**Changes to `Session` interface:**
```typescript
export interface Session {
    id: string;
    user_id: number;
    expires_at: string;
    selected_branch?: string; // NEW: Branch context for this session
    user?: User;
}
```

**Changes to `User` interface:**
```typescript
export interface User {
    id: number;
    username: string;
    email?: string;
    role: 'Admin' | 'HR' | 'Manager' | 'Employee' | 'President' | 'Vice President';
    employee_id?: number;
    is_active: number;
    assigned_branch?: string; // NEW: User's assigned branch
}
```

### 2.3 Update `createSession` Function
Store branch context in session:
```typescript
export async function createSession(user: User, selectedBranch?: string): Promise<string> {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    await query(
        "INSERT INTO sessions (id, user_id, expires_at, selected_branch) VALUES ($1, $2, $3, $4)",
        [sessionId, user.id, expiresAt, selectedBranch || user.assigned_branch]
    );
    
    return sessionId;
}
```

### 2.4 Update `getSession` Function
Include branch in session retrieval:
```typescript
export async function getSession(sessionId: string): Promise<{ user: User; expiresAt: number; selectedBranch?: string } | null> {
    const sessionRes = await query("SELECT * FROM sessions WHERE id = $1", [sessionId]);
    if (sessionRes.rows.length === 0) return null;

    const session = sessionRes.rows[0];
    const expiresAt = new Date(session.expires_at).getTime();

    if (Date.now() > expiresAt) {
        await deleteSession(sessionId);
        return null;
    }

    const userRes = await query("SELECT * FROM users WHERE id = $1", [session.user_id]);
    if (userRes.rows.length === 0) return null;
    const user = userRes.rows[0];

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            employee_id: user.employee_id,
            is_active: user.is_active,
            assigned_branch: user.assigned_branch
        },
        selectedBranch: session.selected_branch,
        expiresAt
    };
}
```

---

## Phase 3: Authorization & Access Control Helpers

### 3.1 Create Branch Access Control Helper
**File:** `lib/branch-access.ts` (NEW FILE)

```typescript
export function isSuperAdmin(role: string): boolean {
    return ['President', 'Vice President'].includes(role);
}

export function canAccessBranch(
    userRole: string,
    userBranch: string | undefined,
    requestedBranch: string
): boolean {
    // Super Admins can access all branches
    if (isSuperAdmin(userRole)) {
        return true;
    }
    
    // Branch admins/employees can only access their assigned branch
    return userBranch?.toUpperCase() === requestedBranch?.toUpperCase();
}

export function validateBranchAccess(
    userRole: string,
    userBranch: string | undefined,
    selectedBranch: string | undefined,
    dataBranch: string
): { allowed: boolean; reason?: string } {
    // Super Admin: Always allowed
    if (isSuperAdmin(userRole)) {
        return { allowed: true };
    }
    
    // Check if session branch matches data branch
    if (!selectedBranch) {
        return { allowed: false, reason: 'No branch selected in session' };
    }
    
    if (!userBranch) {
        return { allowed: false, reason: 'User has no assigned branch' };
    }
    
    if (selectedBranch.toUpperCase() !== userBranch.toUpperCase()) {
        return { allowed: false, reason: 'Session branch does not match user assigned branch' };
    }
    
    if (dataBranch.toUpperCase() !== selectedBranch.toUpperCase()) {
        return { allowed: false, reason: `Access denied: Data belongs to ${dataBranch} branch` };
    }
    
    return { allowed: true };
}

export async function logAccessAttempt(params: {
    userId: number;
    action: string;
    attemptedBranch: string;
    userBranch?: string;
    status: 'ALLOWED' | 'DENIED';
    reason?: string;
    ipAddress?: string;
}): Promise<void> {
    const { userId, action, attemptedBranch, userBranch, status, reason, ipAddress } = params;
    
    await query(
        `INSERT INTO access_logs (user_id, attempted_action, attempted_branch, user_branch, status, reason, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, attemptedBranch, userBranch, status, reason, ipAddress]
    );
}
```

---

## Phase 4: API Route Updates (CORE)

### 4.1 Create Middleware for Branch Validation
**File:** `lib/middleware/branch-auth.ts` (NEW FILE)

```typescript
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { validateBranchAccess, logAccessAttempt } from '@/lib/branch-access';

export async function validateBranchRequest(
    request: NextRequest,
    requiredBranch?: string
): Promise<{
    valid: boolean;
    user?: any;
    selectedBranch?: string;
    error?: string;
}> {
    const sessionId = request.cookies.get('sessionId')?.value;
    
    if (!sessionId) {
        return { valid: false, error: 'No session found' };
    }
    
    const session = await getSession(sessionId);
    
    if (!session) {
        return { valid: false, error: 'Invalid or expired session' };
    }
    
    const { user, selectedBranch } = session;
    
    // If a specific branch is required, validate access
    if (requiredBranch) {
        const validation = validateBranchAccess(
            user.role,
            user.assigned_branch,
            selectedBranch,
            requiredBranch
        );
        
        if (!validation.allowed) {
            // Log unauthorized access attempt
            await logAccessAttempt({
                userId: user.id,
                action: request.url,
                attemptedBranch: requiredBranch,
                userBranch: user.assigned_branch,
                status: 'DENIED',
                reason: validation.reason,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
            });
            
            return { valid: false, error: validation.reason };
        }
    }
    
    return { valid: true, user, selectedBranch };
}
```

### 4.2 Update Employee API Routes
**File:** `app/api/employees/route.ts`

**GET Endpoint - List Employees:**
```typescript
// Add branch filtering
export async function GET(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 403 });
        }
        
        const { user, selectedBranch } = validation;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        
        let employees;
        
        if (search) {
            employees = await searchEmployees(search);
        } else {
            employees = await getAllEmployees();
        }
        
        // FILTER BY BRANCH (unless Super Admin)
        if (!isSuperAdmin(user.role) && selectedBranch) {
            employees = employees.filter(emp => 
                emp.branch?.toUpperCase() === selectedBranch.toUpperCase()
            );
        }
        
        return NextResponse.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}
```

**GET Single Employee:**
```typescript
// Validate branch access for single employee
if (id) {
    const employee = await getEmployeeById(parseInt(id));
    
    if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    
    // Validate branch access
    const branchValidation = await validateBranchRequest(request, employee.branch);
    
    if (!branchValidation.valid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // ... rest of employee fetch logic
}
```

**POST Endpoint - Create Employee:**
```typescript
export async function POST(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 403 });
        }
        
        const { user, selectedBranch } = validation;
        const data = await request.json();
        
        // ENFORCE: Branch admins can only create employees in their branch
        if (!isSuperAdmin(user.role)) {
            if (data.branch?.toUpperCase() !== selectedBranch?.toUpperCase()) {
                return NextResponse.json({
                    error: `You can only create employees for ${selectedBranch} branch`
                }, { status: 403 });
            }
        }
        
        const employeeId = await createEmployee(data, user.id);
        
        return NextResponse.json({ id: employeeId, success: true });
    } catch (error) {
        console.error('Create employee error:', error);
        return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
}
```

**PUT/PATCH/DELETE Endpoints:**
Apply similar branch validation as GET single employee.

### 4.3 Update Attendance API Routes
**Files:**
- `app/api/attendance/route.ts`
- `app/api/attendance/[id]/route.ts`

**Apply same pattern:**
1. Validate session and get selected branch
2. Filter attendance records by employee's branch
3. Prevent cross-branch attendance access

### 4.4 Update Payroll API Routes
**Files:**
- `app/api/payroll/route.ts`
- `app/api/payroll/[id]/route.ts`

**Apply same pattern:**
1. Filter payroll runs by branch
2. Filter payslips to only include employees from allowed branch(es)

### 4.5 Update Leave API Routes
**File:** `app/api/leave/route.ts`

**Apply branch filtering to leave requests**

### 4.6 Update User Management API
**File:** `app/api/users/route.ts`

**Restrictions:**
1. Branch Admins can only create users with their assigned branch
2. Branch Admins can only view/edit users from their branch
3. Super Admins can access all users

### 4.7 Update Reports API
**File:** `app/api/reports/route.ts`

**Filter all reports by branch**

### 4.8 Update Kiosk Scanner
**File:** Kiosk-related API endpoints

**Ensure:**
1. QR scan validates employee's branch against scanner's branch
2. Reject cross-branch scans

---

## Phase 5: Frontend UI Updates

### 5.1 Login Page - Branch Selection
**File:** `app/page.tsx`

**Add Branch Selection UI:**
```typescript
const [selectedBranch, setSelectedBranch] = useState<string>('');
const [availableBranches, setAvailableBranches] = useState<string[]>([]);
const [showBranchSelection, setShowBranchSelection] = useState(false);
const [tempUser, setTempUser] = useState<any>(null);

// After successful login, if user is NOT Super Admin, show branch selection
const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
        // Check if user needs to select branch
        if (data.requireBranchSelection) {
            setTempUser(data.user);
            setAvailableBranches(data.branches || ['Naval', 'Ormoc']);
            setShowBranchSelection(true);
        } else {
            // Super Admin - direct login
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push('/dashboard');
        }
    } else {
        setError(data.error || 'Login failed');
    }
};

const handleBranchSelection = async () => {
    // Send branch selection to backend
    const response = await fetch('/api/auth/select-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: tempUser.id,
            selectedBranch 
        }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
        localStorage.setItem('sessionId', data.sessionId);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('selectedBranch', selectedBranch);
        router.push('/dashboard');
    }
};
```

### 5.2 Create Branch Selection API Endpoint
**File:** `app/api/auth/select-branch/route.ts` (NEW)

### 5.3 Dashboard Updates
**File:** `app/dashboard/page.tsx`

**Add branch indicator in UI:**
- Display current selected branch prominently
- Show "All Branches" for Super Admins
- Lock branch context (cannot change without re-login)

### 5.4 Employee List Pages
**Files:**
- `app/employees/page.tsx`
- All employee-related components

**Update:**
- Display only branch-filtered employees
- Remove branch selector for non-Super Admins
- Show branch badge on employee cards

### 5.5 User Management Page
**File:** User management UI

**Add:**
- Branch assignment dropdown when creating users
- Validate branch assignment for Branch Admins

---

## Phase 6: Security Controls

### 6.1 Direct URL Access Prevention
**Implement middleware at Next.js level:**

**File:** `middleware.ts` (root-level)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Validate session on all protected routes
    // Check branch context for all data-access routes
    // Return 403 if branch validation fails
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/employees/:path*',
        '/attendance/:path*',
        '/payroll/:path*',
        '/api/:path*'
    ]
};
```

### 6.2 Session Persistence
- Branch context persists throughout session
- Cannot be changed without logout + re-login
- Session cookie includes branch context

### 6.3 Access Logging
All access: Record attempts in `access_logs` table:
- User ID
- Action attempted
- Branch attempted
- Result (allowed/denied)
- Timestamp
- IP address

---

## Phase 7: Data Migration

### 7.1 Migration Script
**File:** `scripts/migrate-branch-access-control.js` (NEW)

**Steps:**
1. Add `assigned_branch` column to `users` table
2. Add `selected_branch` column to `sessions` table
3. Create `access_logs` table
4. Assign default branches to existing users based on their role
5. Update all President/Vice President users to have NULL assigned_branch (indicating all-branch access)

### 7.2 Existing User Update
Prompt admin to assign branches to existing users during first run.

---

## Phase 8: Testing & Validation

### 8.1 Test Scenarios

**Test 1: Branch Manager (Naval) - Employee Access**
- ✅ Can view Naval employees
- ❌ Cannot view Ormoc employees
- ❌ Cannot edit Ormoc employees
- ❌ Cannot create employees in Ormoc branch

**Test 2: Branch Manager (Ormoc) - Employee Access**
- ✅ Can view Ormoc employees
- ❌ Cannot view Naval employees

**Test 3: Super Admin**
- ✅ Can view ALL employees
- ✅ Can create employees in ANY branch
- ✅ Can switch between branches (or view all at once)

**Test 4: Direct URL Access**
- ❌ Branch Admin accessing `/api/employees?id=<ormoc_employee_id>` should be rejected

**Test 5: Kiosk Scanner**
- ❌ Naval employee QR code scanned at Ormoc scanner should be rejected

**Test 6: Reports**
- Branch Admin should only see reports for their branch

### 8.2 Validation Checklist
- [ ] Database migration completed
- [ ] All API endpoints enforce branch filtering
- [ ] UI reflects branch restrictions
- [ ] Session management includes branch context
- [ ] Direct URL access blocked
- [ ] Access logging functional
- [ ] Kiosk scanner branch-bound
- [ ] User management restricted
- [ ] Reports filtered by branch

---

## Phase 9: Documentation & Deployment

### 9.1 User Guide
Document for admins:
- How to assign branches to users
- How branch access works
- How to review access logs

### 9.2 Deployment Steps
1. Backup database
2. Run migration script
3. Deploy updated code
4. Assign branches to existing users
5. Test all scenarios
6. Monitor access logs for issues

---

## Implementation Priority

1. **HIGH PRIORITY (Phase 1-3):**
   - Database schema updates
   - Authentication & session management
   - Branch access control helpers

2. **CRITICAL (Phase 4):**
   - API route updates with branch filtering
   - This is the CORE security layer

3. **HIGH PRIORITY (Phase 5):**
   - Frontend UI updates
   - Branch selection at login

4. **MEDIUM PRIORITY (Phase 6-7):**
   - Security controls
   - Data migration

5. **FINAL (Phase 8-9):**
   - Testing
   - Documentation

---

## Validation Rule (NON-NEGOTIABLE)

> **If a Branch Admin can see, edit, or process employees from another branch, the implementation is INVALID.**

This must be tested at EVERY stage.

---

## Notes
- Branch names are case-insensitive ("NAVAL" === "Naval" === "naval")
- Super Admin role = President or Vice President
- Session must expire on logout
- All cross-branch access attempts must be logged
- UI must clearly indicate current branch context

---

## Next Steps
1. Review and approve this implementation plan
2. Begin Phase 1: Database schema updates
3. Proceed sequentially through phases
