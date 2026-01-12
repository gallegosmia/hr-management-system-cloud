import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getAll, update } from '@/lib/database';
import { verifyPassword, createSession } from '@/lib/auth';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
    try {
        if (!dbInitialized) {
            await initializeDatabase();
            dbInitialized = true;
        }

        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Find user - Optimized to not fetch all users
        const { query } = require('@/lib/database');
        const res = await query("SELECT * FROM users WHERE username = $1 AND is_active = 1", [username]);
        const user = res.rows[0];

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Verify password
        if (!verifyPassword(password, user.password)) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Update last login
        await update('users', user.id, { last_login: new Date().toISOString() });

        // Create session
        const sessionId = await createSession({
            id: user.id,
            username: user.username,
            role: user.role,
            employee_id: user.employee_id,
            is_active: user.is_active
        });

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            sessionId,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'An error occurred during login' },
            { status: 500 }
        );
    }
}
