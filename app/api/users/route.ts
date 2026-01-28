import { NextRequest, NextResponse } from 'next/server';
import { getAll, getById, insert, update, query, remove } from '@/lib/database';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const sql = `
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.is_active, 
                u.status,
                u.password,
                u.employee_id, 
                u.last_login, 
                u.created_at,
                u.two_fa_enabled,
                u.email as user_email,
                e.first_name,
                e.last_name,
                e.email_address as employee_email
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
        `;
        const res = await query(sql);

        const safeUsers = (res.rows || []).map((u: any) => ({
            id: u.id,
            username: u.username || 'unknown',
            role: u.role || 'Employee',
            is_active: u.is_active ?? 1,
            status: u.status || 'ACTIVE',
            employee_id: u.employee_id,
            last_login: u.last_login,
            created_at: u.created_at,
            email: u.user_email || u.employee_email || u.email || '',
            password: u.password,
            full_name: u.first_name ? `${u.first_name} ${u.last_name}` : (u.full_name || u.username || 'User'),
            two_fa_enabled: u.two_fa_enabled === 1 || u.two_fa_enabled === true
        }));

        return NextResponse.json(safeUsers);
    } catch (error: any) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.username || !data.password || !data.role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if username exists
        const res = await query("SELECT id FROM users WHERE username = $1", [data.username]);
        if (res.rows.length > 0) {
            return NextResponse.json(
                { error: 'Username already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = hashPassword(data.password);

        const userId = await insert('users', {
            username: data.username,
            password: hashedPassword,
            role: data.role,
            is_active: 1,
            status: 'ACTIVE',
            employee_id: data.employee_id || null
        });

        return NextResponse.json({ success: true, id: userId });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, ...data } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const updates: any = { ...data };
        if (data.password) {
            updates.password = hashPassword(data.password);
        }

        // Sync with status column if is_active is changed
        if (data.is_active === 1) {
            updates.status = 'ACTIVE';
            // Update queue if it exists
            await query("UPDATE admin_approval_queue SET status = 'APPROVED', processed_at = $1 WHERE user_id = $2", [new Date().toISOString(), id]);
        } else if (data.is_active === -1) {
            updates.status = 'REJECTED';
            await query("UPDATE admin_approval_queue SET status = 'REJECTED', processed_at = $1 WHERE user_id = $2", [new Date().toISOString(), id]);
        }

        await update('users', id, updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const user = await getById('users', parseInt(id));
        if (user && user.username === 'admin') {
            return NextResponse.json(
                { error: 'Protected system user cannot be deleted' },
                { status: 403 }
            );
        }

        // Soft delete: Mark as DELETED
        await update('users', id, {
            is_active: -2,
            status: 'DELETED'
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
