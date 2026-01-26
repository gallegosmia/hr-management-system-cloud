export async function sendEmail(to: string, subject: string, text: string) {
    console.log('--------------------------------------------------');
    console.log(`EMULATION: Sending Email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('--------------------------------------------------');

    // In a real app, you'd use nodemailer or a service like SendGrid/SES here
    return true;
}
