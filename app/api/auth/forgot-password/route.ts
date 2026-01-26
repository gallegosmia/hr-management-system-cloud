import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendEmail } from '@/lib/email';

// Helper to mask email for security (e.g., r****z@email.com)
function maskEmail(email: string): string {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!domain) return email; // Should not happen with valid email
    if (localPart.length <= 2) {
        return `${localPart[0]}****@${domain}`;
    }
    return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

export async function POST(request: NextRequest) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // 1. Check if user exists and has a registered email
        const userRes = await query("SELECT id, username, email FROM users WHERE username = $1", [username]);

        if (userRes.rows.length === 0) {
            // Security: We can either say "Username not found" or "OTP sent if account exists"
            // The prompt asks to "Reject OTP requests if no verified email exists for the account"
            // and "Display appropriate error messages for: Invalid or unregistered email" (from previous requirement)
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

        // 4. Log the attempt for security audit
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
        await query(
            "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
            [user.id, 'OTP_SENT', JSON.stringify({ email_masked: maskEmail(user.email) }), ipAddress]
        );

        // 5. Send Email
        await sendEmail(
            user.email,
            'Your OTP for Password Reset',
            `Hi ${user.username},\n\nYour one-time password for resetting your password is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`
        );

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
            maskedEmail: maskEmail(user.email)
        });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
