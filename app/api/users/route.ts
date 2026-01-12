import { NextRequest, NextResponse } from 'next/server';
import { getAll, getById, insert, update, query, remove } from '@/lib/database';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const users = await getAll('users');
        // Remove sensitive data
        const safeUsers = users.map((u: any) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            is_active: u.is_active,
            employee_id: u.employee_id,
            last_login: u.last_login,
            created_at: u.created_at
        }));
        return NextResponse.json(safeUsers);
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
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

        await remove('users', parseInt(id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
