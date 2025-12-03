import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email, resetUrl, username) {
  console.log('=== SENDING PASSWORD RESET EMAIL ===');
  console.log('To:', email);
  console.log('Reset URL:', resetUrl);
  console.log('Username:', username);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: "Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin: 20px 0;">
            <h1 style="color: #2563eb; margin-top: 0;">Password Reset Request</h1>
            <p style="font-size: 16px;">Hi ${username},</p>
            <p style="font-size: 16px;">You requested a password reset for your account.</p>
            <p style="font-size: 16px;">Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #666; word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            <p style="font-size: 14px; color: #666;">
              <strong>This link will expire in 1 hour.</strong>
            </p>
            <p style="font-size: 14px; color: #666;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Email sent successfully!');
    console.log('Email ID:', data?.id);
    console.log('====================================');

    return { success: true, data };
  } catch (error) {
    console.error('=== EMAIL SENDING ERROR ===');
    console.error('Error:', error);
    console.error('===========================');
    throw error;
  }
}