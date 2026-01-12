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
    role: 'Admin' | 'HR' | 'Manager' | 'Employee' | 'President' | 'Vice President';
    employee_id?: number;
    is_active: number;
}

export interface Session {
    id: string;
    user_id: number;
    expires_at: string;
    user?: User; // Joined user data
}

export async function createSession(user: User): Promise<string> {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await query(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
        [sessionId, user.id, expiresAt]
    );

    return sessionId;
}

export async function getSession(sessionId: string): Promise<{ user: User; expiresAt: number } | null> {
    const res = await query(
        `SELECT s.id, s.expires_at, u.id as user_id, u.username, u.role, u.employee_id, u.is_active 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = $1`,
        [sessionId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const expiresAt = new Date(row.expires_at).getTime();

    if (Date.now() > expiresAt) {
        await deleteSession(sessionId);
        return null;
    }

    return {
        user: {
            id: row.user_id,
            username: row.username,
            role: row.role,
            employee_id: row.employee_id,
            is_active: row.is_active
        },
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
