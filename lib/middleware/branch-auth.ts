/**
 * Branch Authentication Middleware
 * 
 * This middleware provides helper functions to validate branch-based access
 * in API routes. It should be used at the beginning of each API route that
 * handles branch-sensitive data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { validateBranchAccess, logAccessAttempt, getClientIp, isSuperAdmin, normalizeBranchName } from '@/lib/branch-access';

export interface BranchValidationResult {
    valid: boolean;
    user?: {
        id: number;
        username: string;
        role: string;
        assigned_branch?: string;
        employee_id?: number;
    };
    selectedBranch?: string;
    error?: string;
    errorCode?: number;
}

/**
 * Validate that a request has a valid session with branch context
 * 
 * @param request - The incoming Next.js request
 * @param requiredBranch - Optional: Specific branch required for this request
 * @returns Validation result with user data if successful
 */
export async function validateBranchRequest(
    request: NextRequest,
    requiredBranch?: string
): Promise<BranchValidationResult> {
    // Get session ID from cookie or localStorage (sent in request)
    const cookieSessionId = request.cookies.get('sessionId')?.value;
    const headerSessionId = request.headers.get('x-session-id');
    const sessionId = cookieSessionId || headerSessionId;

    if (!sessionId) {
        return {
            valid: false,
            error: 'Authentication required. Please log in.',
            errorCode: 401
        };
    }

    // Get session with user and branch data
    const session = await getSession(sessionId);

    if (!session) {
        return {
            valid: false,
            error: 'Invalid or expired session. Please log in again.',
            errorCode: 401
        };
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
                action: `${request.method} ${request.nextUrl.pathname}`,
                attemptedBranch: requiredBranch,
                userBranch: user.assigned_branch,
                status: 'DENIED',
                reason: validation.reason,
                ipAddress: getClientIp(request.headers)
            });

            return {
                valid: false,
                error: validation.reason || 'Access denied to this branch data',
                errorCode: 403
            };
        }

        // Log successful access
        await logAccessAttempt({
            userId: user.id,
            action: `${request.method} ${request.nextUrl.pathname}`,
            attemptedBranch: requiredBranch,
            userBranch: user.assigned_branch,
            status: 'ALLOWED',
            ipAddress: getClientIp(request.headers)
        });
    }

    return {
        valid: true,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            assigned_branch: user.assigned_branch,
            employee_id: user.employee_id
        },
        selectedBranch
    };
}

/**
 * Convenience function to get session with error response
 * Returns user and branch data or a NextResponse error
 * 
 * @param request - The incoming request
 * @param requiredBranch - Optional: Required branch for access
 * @returns [user, selectedBranch] or NextResponse with error
 */
export async function requireBranchAuth(
    request: NextRequest,
    requiredBranch?: string
): Promise<
    | [{ id: number; username: string; role: string; assigned_branch?: string; employee_id?: number }, string | undefined]
    | NextResponse
> {
    const validation = await validateBranchRequest(request, requiredBranch);

    if (!validation.valid) {
        return NextResponse.json(
            { error: validation.error },
            { status: validation.errorCode || 403 }
        );
    }

    return [validation.user!, validation.selectedBranch];
}

/**
 * Check if user can modify data for a specific branch
 * Used for POST, PUT, PATCH operations
 * 
 * @param request - The incoming request
 * @param targetBranch - The branch of the data being created/modified
 * @returns Validation result
 */
export async function canModifyBranchData(
    request: NextRequest,
    targetBranch: string
): Promise<BranchValidationResult> {
    const validation = await validateBranchRequest(request);

    if (!validation.valid) {
        return validation;
    }

    const { user, selectedBranch } = validation;

    // Super Admins can modify any branch
    if (isSuperAdmin(user!.role)) {
        return { valid: true, user, selectedBranch };
    }

    // Check if user's assigned branch matches target branch
    if (!user!.assigned_branch) {
        return {
            valid: false,
            error: 'User has no assigned branch',
            errorCode: 403
        };
    }

    if (normalizeBranchName(user!.assigned_branch) !== normalizeBranchName(targetBranch)) {
        // Log unauthorized modification attempt
        await logAccessAttempt({
            userId: user!.id,
            action: `${request.method} ${request.nextUrl.pathname} (CREATE/MODIFY)`,
            attemptedBranch: targetBranch,
            userBranch: user!.assigned_branch,
            status: 'DENIED',
            reason: `Attempted to create/modify data for ${targetBranch} branch`,
            ipAddress: getClientIp(request.headers)
        });

        return {
            valid: false,
            error: `You can only create/modify data for ${user!.assigned_branch} branch`,
            errorCode: 403
        };
    }

    return { valid: true, user, selectedBranch };
}

/**
 * Helper to extract session from request
 * Returns null if no valid session
 */
export async function getRequestSession(request: NextRequest) {
    const cookieSessionId = request.cookies.get('sessionId')?.value;
    const headerSessionId = request.headers.get('x-session-id');
    const sessionId = cookieSessionId || headerSessionId;

    if (!sessionId) return null;

    return await getSession(sessionId);
}
