# Email Configuration Guide

Your HR System needs an email account to send "Forgot Password" OTPs and notifications. Since this information is sensitive (passwords), it was not included in the default setup.

## 1. Get an Email Account for Sending

The easiest and most reliable method is to use a **Gmail** account with an **App Password**.

### How to get a Gmail App Password:
1.  Go to your Google Account settings.
2.  Enable **2-Step Verification** (if not already enabled).
3.  Go to the search bar in settings and type **"App passwords"**.
4.  Create a new App Password (name it "HR System").
5.  Copy the 16-character password generated.

---

## 2. Configure Your Cloud Environment

You need to add these variables to your hosting provider (Vercel, Railway, etc.).

### Variables to Add:

| Variable Name | Value Example | Description |
| :--- | :--- | :--- |
| `SMTP_HOST` | `smtp.gmail.com` | The email server address |
| `SMTP_PORT` | `465` | The secure port (usually 465 or 587) |
| `SMTP_USER` | `your-email@gmail.com` | Your full email address |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | Your App Password (not your login password!) |
| `SMTP_FROM` | `HR System <no-reply@company.com>` | Optional: How the sender appears |

---

## 3. Configure Local Development (Optional)

If you want to test email sending on your localhost, add these to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
```

> **Note:** Do NOT commit your `.env` file to GitHub if it contains real passwords!

---

## Troubleshooting

-   **"Email service is not configured"**: This means the variables above are missing in your cloud dashboard.
-   **"Authentication failed"**: Check if your App Password is correct. Do not use your regular Gmail password.
