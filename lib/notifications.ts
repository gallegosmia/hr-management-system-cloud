import { query } from '@/lib/database';
import { ensureUserNotificationsTable } from '@/lib/notification-schema';

export type NotificationType = 
    | 'PAYROLL_SUBMITTED' 
    | 'PAYROLL_PENDING_OPS' 
    | 'PAYROLL_PENDING_EVP' 
    | 'PAYROLL_RELEASED'
    | 'PAYROLL_RETURNED'
    | 'CASH_ADVANCE_SUBMITTED'
    | 'CASH_ADVANCE_PENDING_EVP'
    | 'CASH_ADVANCE_APPROVED'
    | 'CASH_ADVANCE_REJECTED'
    | 'GOV_CONTRIBUTION_SUBMITTED'
    | 'GOV_CONTRIBUTION_APPROVED'
    | 'GOV_CONTRIBUTION_REJECTED'
    | 'LEAVE_APPROVED'
    | 'LEAVE_REJECTED'
    | 'LOAN_APPROVED'
    | 'LOAN_REJECTED'
    | 'system'
    | 'alert'
    | 'info';

export type NotificationSeverity = 'low' | 'medium' | 'high';

/**
 * Creates a notification in the user_notifications table for the specified user.
 * 
 * @param userId - ID of the user to notify
 * @param type - Type identifier for the notification (used for icons/filtering)
 * @param title - Short title of the notification
 * @param message - Detailed message body
 * @param link - The URL the notification should route to when clicked
 * @param referenceId - Optional identifier for the specific transaction (e.g. payroll run id)
 * @param severity - Severity of the notification ('low'|'medium'|'high')
 */
export async function createNotification({
    userId,
    type,
    title,
    message,
    link,
    referenceId,
    severity = 'medium'
}: {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
    referenceId?: string;
    severity?: NotificationSeverity;
}) {
    try {
        await ensureUserNotificationsTable();
        await query(`
            INSERT INTO user_notifications (user_id, title, message, type, severity, link, reference_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
        `, [
            userId,
            title,
            message,
            type,
            severity,
            link,
            referenceId || null
        ]);
        return true;
    } catch (error) {
        console.error('Failed to create notification:', error);
        // We catch and suppress here so a notification failure doesn't block the main transaction response,
        // but we return false to indicate it failed.
        return false;
    }
}

export async function createNotificationsForUsers(
    userIds: number[],
    notification: Omit<Parameters<typeof createNotification>[0], 'userId'>
) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    for (const userId of uniqueUserIds) {
        await createNotification({ userId, ...notification });
    }
}

export async function getNotificationRecipientIds({
    roles,
    branch,
    includeSuperadmin = true,
}: {
    roles: string[];
    branch?: string | null;
    includeSuperadmin?: boolean;
}): Promise<number[]> {
    const rolePlaceholders = roles.map((_, i) => `$${i + 1}`).join(', ');
    const params: any[] = [...roles];
    let sql = `
        SELECT id, username, role, assigned_branch
        FROM users
        WHERE role IN (${rolePlaceholders})
    `;

    if (includeSuperadmin) {
        sql = `
            SELECT id, username, role, assigned_branch
            FROM users
            WHERE (role IN (${rolePlaceholders}) OR username = 'superadmin')
        `;
    }

    try {
        const res = await query(sql, params);
        const normalizedBranch = normalizeBranch(branch);
        return res.rows
            .filter((row: any) => {
                if (!normalizedBranch) return true;
                if (row.username === 'superadmin') return true;
                if (['President', 'Vice President', 'Super Admin'].includes(row.role)) return true;
                return normalizeBranch(row.assigned_branch) === normalizedBranch;
            })
            .map((row: any) => Number(row.id))
            .filter(Boolean);
    } catch (error) {
        console.error('Failed to resolve notification recipients:', error);
        return [];
    }
}

export async function getEmployeeUserId(employeeId: number): Promise<number | null> {
    const res = await query(`SELECT id FROM users WHERE employee_id = $1 LIMIT 1`, [employeeId]);
    return res.rows.length > 0 ? Number(res.rows[0].id) : null;
}

function normalizeBranch(branch?: string | null): string {
    if (!branch || branch === 'All' || branch === 'All Branches') return '';
    return branch.replace(/\s*branch\s*$/i, '').trim().toUpperCase();
}
