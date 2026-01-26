import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { username, otp, newPassword } = await request.json();

        if (!username || !otp || !newPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // 1. Verify OTP again (for security)
        const userRes = await query(
            "SELECT id, reset_otp, reset_otp_expires_at FROM users WHERE username = $1",
            [username]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const user = userRes.rows[0];

        if (!user.reset_otp || user.reset_otp !== otp) {
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
        }

        const expiresAt = new Date(user.reset_otp_expires_at).getTime();
        if (Date.now() > expiresAt) {
            return NextResponse.json({ error: 'Verification expired' }, { status: 400 });
        }

        // 2. Hash new password
        const hashedPassword = hashPassword(newPassword);

        // 3. Update password and clear OTP
        await query(
            "UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $2",
            [hashedPassword, user.id]
        );

        // 4. Log the password reset action
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
        await query(
            "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
            [user.id, 'PASSWORD_RESET', JSON.stringify({ status: 'success' }), ipAddress]
        );

        return NextResponse.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
