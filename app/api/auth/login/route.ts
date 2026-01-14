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

        // Find user
        const users = await getAll('users');
        const user = users.find((u: any) => u.username === username);

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Check active status
        if (user.is_active !== 1) {
            return NextResponse.json(
                { error: 'Your account is pending approval or inactive. Please contact the administrator.' },
                { status: 403 }
            );
        }

        // Verify password
        if (!verifyPassword(password, user.password)) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Update last login (Non-blocking)
        try {
            await update('users', user.id, { last_login: new Date().toISOString() });
        } catch (updateError) {
            console.error('Failed to update last_login (non-fatal):', updateError);
        }

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
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Login failed: ' + (error.message || 'Unknown error'), details: error.stack },
            { status: 500 }
        );
    }
}
