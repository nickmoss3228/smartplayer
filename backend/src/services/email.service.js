import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email, resetUrl, username) {
  console.log('=== SENDING PASSWORD RESET EMAIL ===');
  console.log('To:', email);
  console.log('Reset URL:', resetUrl);
  console.log('Username:', username);
  
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: "🔒 Reset Your Password - Infinity Player",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          
          <!-- Main Container -->
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0f172a;">
            <tr>
              <td style="padding: 40px 20px;">
                
                <!-- Content Card -->
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);">
                  
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px 16px 0 0;">
                      <div style="background-color: rgba(255, 255, 255, 0.1); width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255, 255, 255, 0.2);">
                        <span style="font-size: 40px;">🔒</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        Password Reset
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                        Hi <strong style="color: #60a5fa;">${username}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                        We received a request to reset your password for your <strong>Infinity Player</strong> account. No worries, it happens to the best of us!
                      </p>
                      
                      <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                        Click the button below to create a new password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="text-align: center; padding: 20px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transition: all 0.3s;">
                              Reset My Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Divider -->
                      <div style="margin: 30px 0; border-top: 1px solid #334155;"></div>
                      
                      <!-- Alternative Link -->
                      <p style="margin: 0 0 10px; color: #94a3b8; font-size: 13px;">
                        Or copy and paste this link into your browser:
                      </p>
                      <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; word-break: break-all;">
                        <a href="${resetUrl}" style="color: #60a5fa; text-decoration: none; font-size: 13px; line-height: 1.6;">
                          ${resetUrl}
                        </a>
                      </div>
                      
                      <!-- Warning Box -->
                      <div style="margin-top: 30px; background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px;">
                        <p style="margin: 0; color: #fca5a5; font-size: 14px; line-height: 1.5;">
                          ⏰ <strong>Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons.
                        </p>
                      </div>
                      
                      <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                      </p>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #0f172a; border-radius: 0 0 16px 16px; border-top: 1px solid #334155;">
                      <p style="margin: 0 0 10px; color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
                        This email was sent by <strong style="color: #94a3b8;">Infinity Player</strong>
                      </p>
                      <p style="margin: 0; color: #475569; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Infinity Player. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
              </td>
            </tr>
          </table>
          
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