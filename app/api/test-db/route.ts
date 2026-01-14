import { NextResponse } from 'next/server';
import { getAll } from '@/lib/database';

export async function GET() {
    try {
        const users = await getAll('users');
        const adminUser = users.find((u: any) => u.username === 'Mel');

        let passwordCheck = 'Not checked';
        if (adminUser) {
            const bcrypt = require('bcryptjs');
            // In JSON DB we don't know the exact hash algo used previously but usually bcrypt
            const match = bcrypt.compareSync('admin123', adminUser.password);
            passwordCheck = match ? 'Password Match' : 'Password Mismatch';
        }

        return NextResponse.json({
            status: process.env.DATABASE_URL ? 'Connected (PostgreSQL Mode)' : 'Connected (Local JSON Mode)',
            mode: process.env.DATABASE_URL ? 'Cloud' : 'Local',
            users: users.map((u: any) => ({ username: u.username, role: u.role, is_active: u.is_active })),
            adminUserFound: !!adminUser,
            passwordCheck
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'Error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
