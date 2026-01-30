import bcrypt from 'bcryptjs';
import { query, getAll, insert, remove } from './database';

export function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
}

export interface User {
    id: number;
    username: string;
    email?: string;
    role: 'HR' | 'Employee' | 'President' | 'Vice President'; // Simplified 3-role system
    employee_id?: number;
    is_active: number;
    assigned_branch?: string; // Branch assignment for access control
    hr_approval_status?: string | null; // PENDING, APPROVED, REJECTED (for HR users)
    hr_approved_by?: number | null; // User ID of approving Super Admin
    hr_approved_at?: string | null; // Timestamp of approval
}

export interface Session {
    id: string;
    user_id: number;
    expires_at: string;
    selected_branch?: string; // Runtime branch context
    user?: User; // Joined user data
}

export async function createSession(user: User, selectedBranch?: string): Promise<string> {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Use provided selectedBranch, or fall back to user's assigned_branch
    const branchToStore = selectedBranch || user.assigned_branch || null;

    await query(
        "INSERT INTO sessions (id, user_id, expires_at, selected_branch) VALUES ($1, $2, $3, $4)",
        [sessionId, user.id, expiresAt, branchToStore]
    );

    return sessionId;
}

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
            assigned_branch: user.assigned_branch,
            hr_approval_status: user.hr_approval_status,
            hr_approved_by: user.hr_approved_by,
            hr_approved_at: user.hr_approved_at
        },
        selectedBranch: session.selected_branch,
        expiresAt
    };
}

export async function deleteSession(sessionId: string): Promise<void> {
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

function generateSessionId(): string {
    return Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

export function hasPermission(role: string, action: string): boolean {
    const permissions: Record<string, string[]> = {
        Admin: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage_users'],
        President: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage_users'],
        'Vice President': ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage_users'],
        HR: ['create', 'read', 'update', 'delete', 'approve', 'export'],
        Manager: ['read', 'approve', 'export'],
        Employee: ['read']
    };

    return permissions[role]?.includes(action) || false;
}
