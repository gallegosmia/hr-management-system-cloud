/**
 * Branch Access Control Helper Library
 * 
 * Branch Access Control Library
 * 
 * Centralized logic for branch-based access control and validation.
 * 
 * ROLE SYSTEM (3 roles only):
 * - SUPER ADMIN: President, Vice President (access ALL branches)
 * - HR: Branch-restricted access to ALL modules
 * - EMPLOYEE: Self-data access only
 */

import { query } from './database';

/**
 * Robust branch name normalization
 * - Removes "Branch" suffix (case-insensitive)
 * - Trims whitespace
 * - Converts to uppercase
 * - Handles null/undefined
 */
export function normalizeBranchName(branch: string | undefined | null): string {
    if (!branch) return '';
    return branch.replace(/\s*branch\s*$/i, '').trim().toUpperCase();
}

// ==================== ROLE DEFINITIONS ====================

/**
 * Check if user is a Super Admin
 * Super Admins have access to ALL branches and ALL data
 */
export function isSuperAdmin(role: string): boolean {
    return role === 'President' || role === 'Vice President';
}

/**
 * Check if user is HR
 * HR users have access to ALL modules but ONLY their assigned branch
 */
export function isHR(role: string): boolean {
    return role === 'HR';
}

/**
 * Check if user is Employee
 * Employees have limited access to ONLY their own data
 */
export function isEmployee(role: string): boolean {
    return role === 'Employee';
}

/**
 * Check if HR user is approved by Super Admin
 * HR users must be approved before accessing HR modules
 * 
 * @param user - User object with hr_approval_status
 * @returns true if approved or not HR role, false if pending/rejected
 */
export function isHRApproved(user: { role: string; hr_approval_status?: string | null }): boolean {
    // Non-HR users don't need approval
    if (!isHR(user.role)) {
        return true;
    }

    // HR users must have APPROVED status
    return user.hr_approval_status === 'APPROVED';
}

/**
 * Check if user can access HR modules
 * Combines role check and approval status
 * 
 * @param user - User object with role and hr_approval_status
 * @returns true if user can access HR modules
 */
export function canAccessHRModules(user: { role: string; hr_approval_status?: string | null }): boolean {
    // Super Admins always have access
    if (isSuperAdmin(user.role)) {
        return true;
    }

    // HR users need approval
    if (isHR(user.role)) {
        return isHRApproved(user);
    }

    // Employees cannot access HR modules
    return false;
}

// ==================== BRANCH ACCESS ====================

/**
 * Check if a user can access a specific branch
 * 
 * @param userRole - The user's role
 * @param userBranch - The user's assigned branch
 * @param requestedBranch - The branch being requested
 * @returns true if access is allowed, false otherwise
 */
export function canAccessBranch(
    userRole: string,
    userBranch: string | undefined | null,
    requestedBranch: string | undefined | null
): boolean {
    // Super Admins can access all branches
    if (isSuperAdmin(userRole)) {
        return true;
    }

    // If no requested branch, deny access (should not happen)
    if (!requestedBranch) {
        return false;
    }

    // If user has no assigned branch, deny access
    if (!userBranch) {
        return false;
    }

    // Branch admins/employees can only access their assigned branch
    // Normalized comparison handles variations like "Naval" vs "Naval Branch"
    return normalizeBranchName(userBranch) === normalizeBranchName(requestedBranch);
}

/**
 * Validate branch access with detailed error messaging
 * 
 * @param userRole - The user's role
 * @param userBranch - The user's assigned branch
 * @param selectedBranch - The branch selected in the current session
 * @param dataBranch - The branch of the data being accessed
 * @returns Object with allowed status and optional reason for denial
 */
export function validateBranchAccess(
    userRole: string,
    userBranch: string | undefined | null,
    selectedBranch: string | undefined | null,
    dataBranch: string | undefined | null
): { allowed: boolean; reason?: string } {
    // Super Admin: Always allowed
    if (isSuperAdmin(userRole)) {
        return { allowed: true };
    }

    // Check if data has a branch
    if (!dataBranch) {
        return { allowed: false, reason: 'Data does not have an assigned branch' };
    }

    // Check if session has a branch
    if (!selectedBranch) {
        return { allowed: false, reason: 'No branch selected in session' };
    }

    // Check if user has an assigned branch
    if (!userBranch) {
        return { allowed: false, reason: 'User has no assigned branch' };
    }

    // Verify session branch matches user's assigned branch
    if (normalizeBranchName(selectedBranch) !== normalizeBranchName(userBranch)) {
        return {
            allowed: false,
            reason: `Session branch (${selectedBranch}) does not match user assigned branch (${userBranch})`
        };
    }

    // Verify data branch matches session branch
    if (normalizeBranchName(dataBranch) !== normalizeBranchName(selectedBranch)) {
        return {
            allowed: false,
            reason: `Access denied: Data belongs to ${dataBranch} branch, you are accessing ${selectedBranch} branch`
        };
    }

    return { allowed: true };
}

export function filterByBranch<T extends Record<string, any>>(
    items: T[],
    userRole: string,
    userBranch: string | undefined | null,
    branchField: string = 'branch'
): T[] {
    // Super Admins see everything
    if (isSuperAdmin(userRole)) {
        return items;
    }

    // Filter by user's assigned branch
    if (!userBranch) {
        return []; // No branch = no access
    }

    const normalizedUserBranch = normalizeBranchName(userBranch);

    return items.filter(item => {
        const itemBranch = item[branchField];
        if (!itemBranch) return false;
        const normalizedItemBranch = normalizeBranchName(itemBranch);
        return normalizedItemBranch === normalizedUserBranch;
    });
}

/**
 * Log an access attempt (allowed or denied)
 * All access attempts are recorded for security auditing
 * 
 * @param params - Access log parameters
 */
export async function logAccessAttempt(params: {
    userId: number;
    action: string;
    attemptedBranch: string | undefined | null;
    userBranch: string | undefined | null;
    status: 'ALLOWED' | 'DENIED';
    reason?: string;
    ipAddress?: string;
}): Promise<void> {
    const {
        userId,
        action,
        attemptedBranch,
        userBranch,
        status,
        reason,
        ipAddress
    } = params;

    try {
        await query(
            `INSERT INTO access_logs (user_id, attempted_action, attempted_branch, user_branch, status, reason, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                userId,
                action,
                attemptedBranch || null,
                userBranch || null,
                status,
                reason || null,
                ipAddress || null
            ]
        );
    } catch (error) {
        // Don't fail the request if logging fails, but log the error
        console.error('Failed to log access attempt:', error);
    }
}

/**
 * Get access logs for auditing
 * 
 * @param filters - Optional filters for the logs
 * @returns Array of access log entries
 */
export async function getAccessLogs(filters?: {
    userId?: number;
    status?: 'ALLOWED' | 'DENIED';
    startDate?: string;
    endDate?: string;
    limit?: number;
}): Promise<any[]> {
    let sql = `
        SELECT 
            al.*,
            u.username,
            u.role
        FROM access_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
        sql += ` AND al.user_id = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
    }

    if (filters?.status) {
        sql += ` AND al.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
    }

    if (filters?.startDate) {
        sql += ` AND al.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
    }

    if (filters?.endDate) {
        sql += ` AND al.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
    }

    sql += ` ORDER BY al.created_at DESC`;

    if (filters?.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
    } else {
        sql += ` LIMIT 1000`; // Default limit
    }

    const result = await query(sql, params);
    return result.rows;
}

/**
 * Get unauthorized access attempts (denied access logs)
 * Useful for security monitoring
 * 
 * @param limit - Number of recent attempts to return
 * @returns Array of denied access attempts
 */
export async function getUnauthorizedAttempts(limit: number = 100): Promise<any[]> {
    return getAccessLogs({ status: 'DENIED', limit });
}

/**
 * Validate that a user can create/update data for a specific branch
 * This is used when creating or modifying records
 * 
 * @param userRole - The user's role
 * @param userBranch - The user's assigned branch
 * @param targetBranch - The branch for the data being created/modified
 * @returns Object with allowed status and optional error message
 */
export function canModifyBranch(
    userRole: string,
    userBranch: string | undefined | null,
    targetBranch: string | undefined | null
): { allowed: boolean; error?: string } {
    // Super Admins can modify any branch
    if (isSuperAdmin(userRole)) {
        return { allowed: true };
    }

    if (!targetBranch) {
        return { allowed: false, error: 'Branch is required' };
    }

    if (!userBranch) {
        return { allowed: false, error: 'User has no assigned branch' };
    }

    if (normalizeBranchName(userBranch) !== normalizeBranchName(targetBranch)) {
        return {
            allowed: false,
            error: `You can only create/modify data for ${userBranch} branch`
        };
    }

    return { allowed: true };
}

/**
 * Get list of branches a user can access
 * 
 * @param userRole - The user's role
 * @param userBranch - The user's assigned branch
 * @param allBranches - Array of all available branches
 * @returns Array of branches the user can access
 */
export function getAccessibleBranches(
    userRole: string,
    userBranch: string | undefined | null,
    allBranches: string[]
): string[] {
    // Super Admins can access all branches
    if (isSuperAdmin(userRole)) {
        return allBranches;
    }

    // Regular users can only access their assigned branch
    if (userBranch) {
        const normalizedUserBranch = normalizeBranchName(userBranch);
        return allBranches.filter(
            branch => normalizeBranchName(branch) === normalizedUserBranch
        );
    }

    return [];
}

/**
 * Extract IP address from request headers
 * Handles various proxy headers
 * 
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') ||
        'unknown'
    );
}
