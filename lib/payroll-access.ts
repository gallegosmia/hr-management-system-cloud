/**
 * Payroll Access Control Library
 * Implements branch-based and role-based access control for payroll
 * Date: February 9, 2026
 */

export interface User {
    id: number;
    role: string;
    assigned_branch?: string;
    employee_id?: number;
}

/**
 * Check if user can access payroll for a specific branch
 * Rules:
 * - Super Admin: All branches
 * - President/VP: All branches
 * - Finance: All branches (view only)
 * - HR: Only assigned branch
 * - Others: No access
 */
export function canAccessPayroll(user: User, branch: string): boolean {
    // Super Admin can access all branches
    if (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Operations Manager') {
        return true;
    }

    // President/VP can access all branches
    if (user.role === 'President' || user.role === 'Vice President') {
        return true;
    }

    // Finance can view all branches
    if (user.role === 'Finance') {
        return true;
    }

    // HR can only access their assigned branch
    if (user.role === 'HR') {
        return user.assigned_branch === branch || branch === 'All';
    }

    // Manager can view their branch
    if (user.role === 'Manager') {
        return user.assigned_branch === branch;
    }

    return false;
}

/**
 * Check if user can create payroll
 */
export function canCreatePayroll(user: User): boolean {
    return ['Super Admin', 'Admin', 'HR', 'President', 'Vice President', 'Operations Manager'].includes(user.role);
}

/**
 * Check if user can approve payroll
 */
export function canApprovePayroll(user: User): boolean {
    return ['Super Admin', 'Admin', 'President', 'Vice President', 'Operations Manager'].includes(user.role);
}

/**
 * Check if user can lock payroll
 */
export function canLockPayroll(user: User): boolean {
    return ['Super Admin', 'Admin', 'President', 'Vice President', 'Operations Manager'].includes(user.role);
}

/**
 * Check if user can edit payroll days
 */
export function canEditPayrollDays(user: User): boolean {
    return ['Super Admin', 'Admin', 'HR', 'President', 'Vice President', 'Operations Manager'].includes(user.role);
}

/**
 * Check if user can delete payroll
 */
export function canDeletePayroll(user: User): boolean {
    return ['Super Admin', 'Admin', 'HR', 'Operations Manager', 'President', 'Vice President', 'Finance'].includes(user.role);
}

/**
 * Check if user can view payslip
 */
export function canViewPayslip(user: User, employeeId: number): boolean {
    // Admins and executives can view all
    if (['Super Admin', 'Admin', 'President', 'Vice President', 'HR', 'Finance', 'Operations Manager'].includes(user.role)) {
        return true;
    }

    // Employees can only view their own
    if (user.role === 'Employee') {
        return user.employee_id === employeeId;
    }

    return false;
}

/**
 * Get accessible branches for user
 */
export function getAccessibleBranches(user: User): string[] {
    // Super Admin, President, VP, Finance can access all
    if (['Super Admin', 'Admin', 'President', 'Vice President', 'Finance', 'Operations Manager'].includes(user.role)) {
        return ['All', 'Ormoc', 'Naval'];
    }

    // HR and Manager can only access their assigned branch
    if (['HR', 'Manager'].includes(user.role) && user.assigned_branch) {
        return [user.assigned_branch];
    }

    return [];
}

/**
 * Filter employees by branch access
 */
export function filterEmployeesByAccess(
    employees: Array<{ id: number; branch: string }>,
    user: User,
    targetBranch: string
): Array<{ id: number; branch: string }> {
    // If user can't access the branch, return empty
    if (!canAccessPayroll(user, targetBranch)) {
        return [];
    }

    // If target is 'All', return all employees (for Super Admin/Executives only)
    if (targetBranch === 'All') {
        return employees;
    }

    // Filter by specific branch
    return employees.filter(emp => emp.branch === targetBranch);
}

/**
 * Validate payroll access before operations
 */
export function validatePayrollAccess(
    user: User,
    operation: 'create' | 'view' | 'edit' | 'approve' | 'lock' | 'delete',
    branch?: string
): { allowed: boolean; error?: string } {
    // Check branch access if provided
    if (branch && !canAccessPayroll(user, branch)) {
        return {
            allowed: false,
            error: `You do not have access to payroll for branch: ${branch}`
        };
    }

    // Check operation permissions
    switch (operation) {
        case 'create':
            if (!canCreatePayroll(user)) {
                return {
                    allowed: false,
                    error: 'You do not have permission to create payroll'
                };
            }
            break;

        case 'approve':
            if (!canApprovePayroll(user)) {
                return {
                    allowed: false,
                    error: 'You do not have permission to approve payroll'
                };
            }
            break;

        case 'lock':
            if (!canLockPayroll(user)) {
                return {
                    allowed: false,
                    error: 'You do not have permission to lock payroll'
                };
            }
            break;

        case 'delete':
            if (!canDeletePayroll(user)) {
                return {
                    allowed: false,
                    error: 'You do not have permission to delete payroll'
                };
            }
            break;

        case 'edit':
            if (!canEditPayrollDays(user)) {
                return {
                    allowed: false,
                    error: 'You do not have permission to edit payroll'
                };
            }
            break;
    }

    return { allowed: true };
}

/**
 * Get payroll permissions for user
 */
export function getPayrollPermissions(user: User) {
    return {
        canCreate: canCreatePayroll(user),
        canApprove: canApprovePayroll(user),
        canLock: canLockPayroll(user),
        canEdit: canEditPayrollDays(user),
        canDelete: canDeletePayroll(user),
        accessibleBranches: getAccessibleBranches(user),
        isRestricted: user.role === 'HR' || user.role === 'Manager'
    };
}
