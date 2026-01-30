import { NextRequest, NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/database';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, email, password, role, assigned_branch } = await request.json();

        if (!username || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Username, email, password, and role are required' },
                { status: 400 }
            );
        }

        // Validate role (Simplified 3-role system)
        const validRoles = ['Employee', 'HR', 'President', 'Vice President'];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role selected. Valid roles: Employee, HR, President, Vice President' },
                { status: 400 }
            );
        }

        // Validate branch assignment based on role
        if (role === 'HR') {
            // HR users MUST have an assigned branch
            if (!assigned_branch) {
                return NextResponse.json(
                    { error: 'HR users must have an assigned branch (Naval or Ormoc)' },
                    { status: 400 }
                );
            }

            // Validate branch value
            const validBranches = ['Naval', 'Ormoc', 'Naval Branch', 'Ormoc Branch'];
            if (!validBranches.includes(assigned_branch)) {
                return NextResponse.json(
                    { error: 'Invalid branch. Valid branches: Naval, Ormoc' },
                    { status: 400 }
                );
            }
        }

        if (role === 'President' || role === 'Vice President') {
            // Super Admins should not have a specific branch (NULL = all branches)
            if (assigned_branch) {
                return NextResponse.json(
                    { error: 'Super Admin roles cannot be assigned to a specific branch' },
                    { status: 400 }
                );
            }
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

        // Determine approval status - ALL users need superadmin approval
        // No separate HR approval needed
        const hrApprovalStatus = null;
        const isActive = 0; // Pending superadmin approval
        const status = 'PENDING_APPROVAL';

        // Create user with branch assignment and HR approval status
        const hashedPassword = hashPassword(password);

        const insertResult = await query(
            `INSERT INTO users (
                username, email, password, role, is_active, status, 
                assigned_branch, hr_approval_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id, username, role, email, assigned_branch, hr_approval_status`,
            [
                username,
                email,
                hashedPassword,
                role,
                isActive,
                status,
                assigned_branch || null,
                hrApprovalStatus,
                new Date().toISOString()
            ]
        );

        const newUser = insertResult.rows[0];

        // Insert into Admin Approval Queue
        try {
            await query(
                `INSERT INTO admin_approval_queue (
                    user_id, full_name, email, role, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    newUser.id,
                    username,
                    newUser.email,
                    newUser.role,
                    'PENDING',
                    new Date().toISOString()
                ]
            );
        } catch (queueError) {
            console.error('[SYSTEM ERROR] Failed to insert into Admin Approval Queue:', queueError);
        }

        // Prepare response message based on role
        let message = 'Registration successful! ';
        if (role === 'HR') {
            message += 'Your HR access is pending Super Admin approval.';
        } else if (role === 'Employee') {
            message += 'Your account is pending admin approval.';
        } else {
            message += 'Your Super Admin access is pending security review.';
        }

        return NextResponse.json({
            success: true,
            message,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                assigned_branch: newUser.assigned_branch,
                hr_approval_status: newUser.hr_approval_status
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
