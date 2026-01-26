import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const { username, otp } = await request.json();

        if (!username || !otp) {
            return NextResponse.json({ error: 'Username and OTP are required' }, { status: 400 });
        }

        // 1. Find user with this username
        const userRes = await query(
            "SELECT id, reset_otp, reset_otp_expires_at FROM users WHERE username = $1",
            [username]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const user = userRes.rows[0];

        // 2. Check if OTP matches
        if (!user.reset_otp || user.reset_otp !== otp) {
            return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 });
        }

        // 3. Check if OTP has expired
        const expiresAt = new Date(user.reset_otp_expires_at).getTime();
        if (Date.now() > expiresAt) {
            return NextResponse.json({ error: 'Expired OTP' }, { status: 400 });
        }

        // Success!
        return NextResponse.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
    }
}
