import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { hashPassword } from '@/lib/auth';

export async function GET() {
    try {
        const users = await query('SELECT username, role, is_active FROM users');
        const adminUser = await query("SELECT * FROM users WHERE username = 'Mel'");

        let passwordCheck = 'Not checked';
        if (adminUser.rows.length > 0) {
            const bcrypt = require('bcryptjs');
            const match = bcrypt.compareSync('admin123', adminUser.rows[0].password);
            passwordCheck = match ? 'Password Match' : 'Password Mismatch';
        }

        return NextResponse.json({
            status: 'Connected',
            users: users.rows,
            adminUserFound: adminUser.rows.length > 0,
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
