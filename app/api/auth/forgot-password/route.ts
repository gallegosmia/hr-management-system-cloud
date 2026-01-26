import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendEmail } from '@/lib/email';

// Helper to mask email for security (e.g., r****z@email.com)
function maskEmail(email: string): string {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    if (localPart.length <= 2) {
        return `${localPart[0]}****@${domain}`;
    }
    return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

export async function POST(request: NextRequest) {
    try {
        const { identifier } = await request.json(); // Use 'identifier' which can be username or email

        if (!identifier) {
            return NextResponse.json({ error: 'Username or Email is required' }, { status: 400 });
        }

        // 1. Try to find user in users table by username OR email
        const userRes = await query(
            "SELECT id, username, email FROM users WHERE username = $1 OR email = $1",
            [identifier]
        );

        if (userRes.rows.length === 0) {
            // Check if they exist in employees table instead
            const empRes = await query(
                "SELECT employee_id, email_address FROM employees WHERE email_address = $1",
                [identifier]
            );

            if (empRes.rows.length > 0) {
                return NextResponse.json({
                    error: 'You have an employee record but haven\'t created a login account yet. Please register first.'
                }, { status: 403 });
            }

            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const user = userRes.rows[0];

        if (!user.email) {
            return NextResponse.json({
                error: 'No registered email found for this account. Please contact the administrator.'
            }, { status: 403 });
        }

        // 2. Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        // 3. Save OTP to database
        await query(
            "UPDATE users SET reset_otp = $1, reset_otp_expires_at = $2 WHERE id = $3",
            [otp, expiresAt, user.id]
        );

        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

        // 5. Check audit logs to limit rate (optional but good practice)
        // For now, proceeding with overwrite as per requirement "Invalidate any previous OTP"

        // 6. Send Email and Log Result
        const emailSent = await sendEmail(
            user.email,
            'Your OTP for Password Reset',
            `Hi ${user.username},\n\nYour one-time password for resetting your password is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`
        );

        if (!emailSent) {
            // Log failure
            await query(
                "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
                [user.id, 'OTP_SEND_FAILED', JSON.stringify({ error: 'Email service failed' }), ipAddress]
            );
            return NextResponse.json({
                error: 'Failed to send OTP email. Please check your email configuration or try again later.'
            }, { status: 500 });
        }

        // Log success
        await query(
            "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
            [user.id, 'OTP_SENT', JSON.stringify({ email_masked: maskEmail(user.email) }), ipAddress]
        );

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
            maskedEmail: maskEmail(user.email),
            username: user.username // Send back the actual username
        });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
