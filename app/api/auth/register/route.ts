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
        // Set is_active to 0 (Pending Approval)

        const insertResult = await query(
            "INSERT INTO users (username, password, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role",
            [username, hashedPassword, role, 0, new Date().toISOString()]
        );

        const newUser = insertResult.rows[0];

        // NO Auto-login: Do not create session

        return NextResponse.json({
            success: true,
            message: 'Registration successful! Your account is pending admin approval.',
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
