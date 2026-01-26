import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Check if email exists
        const userRes = await query("SELECT id, username FROM users WHERE email = $1", [email]);

        if (userRes.rows.length === 0) {
            // Security best practice: Don't reveal if email exists
            // But the prompt says "Display appropriate error messages for: Invalid or unregistered email"
            return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
        }

        const user = userRes.rows[0];

        // 2. Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        // 3. Save OTP to database
        await query(
            "UPDATE users SET reset_otp = $1, reset_otp_expires_at = $2 WHERE id = $3",
            [otp, expiresAt, user.id]
        );

        // 4. Send Email
        await sendEmail(
            email,
            'Your OTP for Password Reset',
            `Hi ${user.username || 'there'},\n\nYour one-time password for resetting your password is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`
        );

        return NextResponse.json({
            success: true,
            message: 'OTP sent to your email address'
        });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
