import { NextRequest, NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/database';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, email, password, role } = await request.json();

        if (!username || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Username, email, password, and role are required' },
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
            "INSERT INTO users (username, email, password, role, is_active, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, role, email",
            [username, email, hashedPassword, role, 0, 'PENDING_APPROVAL', new Date().toISOString()]
        );

        const newUser = insertResult.rows[0];

        // 3. Insert into Admin Approval Queue
        try {
            await query(
                "INSERT INTO admin_approval_queue (user_id, full_name, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
                [newUser.id, username, newUser.email, newUser.role, 'PENDING', new Date().toISOString()]
            );
        } catch (queueError) {
            // Requirement 4: If no admin notification is sent (or registration in queue fails), treat as system error and log it.
            console.error('[SYSTEM ERROR] Failed to insert into Admin Approval Queue:', queueError);
            // We still return success for the user registration, but log the system error.
        }

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
