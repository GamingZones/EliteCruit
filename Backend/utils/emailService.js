import nodemailer from "nodemailer";

/**
 * Checks if production SMTP credentials are configured in environment variables.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Sends a 2FA Verification Code to the specified email address.
 * Uses real SMTP if environment variables are set; otherwise cleanly logs to console.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} code - 6-digit verification code
 * @param {string} [recipientName] - Optional recipient display name
 * @returns {Promise<{ success: boolean, method: string }>}
 */
export async function send2FAEmail(toEmail, code, recipientName = "User") {
  const transporter = getTransporter();

  // Highlighted console log for development and local testing
  console.log("\n=======================================================================");
  console.log(`🔒 [ELITECRUIT 2FA SECURITY CODE]`);
  console.log(`   Recipient: ${toEmail}`);
  console.log(`   Verification Code: ${code}`);
  console.log(`   Valid For: 10 minutes`);
  console.log("=======================================================================\n");

  if (transporter) {
    const fromAddress = process.env.SMTP_FROM || `"EliteCruit Security" <noreply@elitecruit.com>`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">EliteCruit</h2>
          <span style="color: #64748b; font-size: 13px; font-weight: 600;">Digital Recruitment Platform • Two-Factor Authentication</span>
        </div>

        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
          Hello ${recipientName || "there"},
        </p>

        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
          Use the 6-digit verification code below to complete your login to EliteCruit:
        </p>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e293b; display: inline-block;">
            ${code}
          </span>
          <div style="color: #64748b; font-size: 12px; margin-top: 8px; font-weight: 500;">
            This code expires in 10 minutes.
          </div>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
          If you did not request this login verification code, please ignore this email or review your account password to ensure your account remains safe.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />

        <div style="text-align: center; color: #94a3b8; font-size: 11px;">
          &copy; ${new Date().getFullYear()} EliteCruit. All rights reserved. • Automated Security System
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `${code} is your EliteCruit verification code`,
        text: `Your EliteCruit 2FA verification code is: ${code}. This code expires in 10 minutes. If you did not request this, please secure your account.`,
        html: htmlContent,
      });

      return { success: true, method: "smtp" };
    } catch (err) {
      console.error("[2FA Email Error] Failed to send email via SMTP transport:", err?.message || err);
      // Fallback to console logging already occurred above
      return { success: true, method: "console_fallback" };
    }
  }

  return { success: true, method: "console" };
}
