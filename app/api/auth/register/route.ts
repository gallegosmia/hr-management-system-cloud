import { NextRequest, NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/database';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, password, role } = await request.json();

        if (!username || !password || !role) {
            return NextResponse.json(
                { error: 'Username, password, and role are required' },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles = ['Employee', 'HR', 'Manager', 'Executive', 'Admin'];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role selected' },
                { status: 400 }
            );
        }

        // Check if user exists
        try {
            const existingUser = await query("SELECT * FROM users WHERE username = $1", [username]);
            if (existingUser.rows.length > 0) {
                return NextResponse.json(
                    { error: 'Username already taken' },
                    { status: 409 }
                );
            }
        } catch (dbError: any) {
            // If table doesn't exist, try initializing
            if (dbError.message?.includes('relation "users" does not exist')) {
                await initializeDatabase();
            } else {
                throw dbError;
            }
        }

        // Create user
        const hashedPassword = hashPassword(password);
        // We'll set employee_id to null for now, or 0.
        // Also ensure is_active is 1.

        const insertResult = await query(
            "INSERT INTO users (username, password, role, is_active, created_at) VALUES ($1, $2, $3, 1, NOW()) RETURNING id, username, role",
            [username, hashedPassword, role]
        );

        const newUser = insertResult.rows[0];

        // Auto-login: Create session
        const sessionId = await createSession({
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            employee_id: 0, // Placeholder
            is_active: 1
        });

        return NextResponse.json({
            success: true,
            sessionId,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Registration failed: ' + error.message },
            { status: 500 }
        );
    }
}
