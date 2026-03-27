import { query } from '@/lib/database';

export type NotificationType = 
    | 'PAYROLL_SUBMITTED' 
    | 'PAYROLL_PENDING_OPS' 
    | 'PAYROLL_PENDING_EVP' 
    | 'PAYROLL_RELEASED'
    | 'PAYROLL_RETURNED'
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
