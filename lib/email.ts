import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, text: string) {
    // Check if SMTP credentials are provided in environment variables
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
        console.warn('⚠️ SMTP credentials not found. Falling back to console logging.');
        console.log('--------------------------------------------------');
        console.log(`EMULATION: Sending Email to ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text}`);
        console.log('--------------------------------------------------');
        return true;
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for others
            auth: {
                user,
                pass,
            },
        });

        await transporter.sendMail({
            from: `"HR Management System" <${from}>`,
            to,
            subject,
            text,
        });

        console.log(`✅ Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email via SMTP:', error);
        // Fallback to console in dev/test if SMTP fails
        console.log('FALLBACK LOG: Email content below:');
        console.log(`To: ${to}\nSubject: ${subject}\nBody: ${text}`);
        return false;
    }
}
