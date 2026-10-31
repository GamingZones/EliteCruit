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
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
    });
  }

  return null;
}

/**
 * Shared branded HTML email wrapper for EliteCruit transactional & security emails.
 */
function buildEliteCruitEmailTemplate({
  badgeText = "Security Verification",
  headline = "Verify Your Identity",
  greetingName = "User",
  introText = "",
  code = "",
  codeSubtext = "This code expires in 10 minutes.",
  highlightBoxHtml = "",
  footerNote = "If you did not initiate this request, please ignore this email or update your password immediately to keep your account secure.",
  actionButtonHtml = "",
}) {
  const year = new Date().getFullYear();
  return `
    <div style="background-color: #f1f5f9; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dbe4ef; box-shadow: 0 8px 24px rgba(12, 42, 71, 0.08);">
        
        <!-- Navy Brand Header -->
        <div style="background: linear-gradient(135deg, #1f3a4b 0%, #0f2f4e 50%, #0c2a47 100%); padding: 24px 28px; text-align: left;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="width: 42px; vertical-align: middle;">
                <div style="width: 36px; height: 36px; border-radius: 9px; background: #f6be45; color: #0a2440; font-weight: 800; font-size: 15px; line-height: 36px; text-align: center; display: inline-block;">
                  EC
                </div>
              </td>
              <td style="vertical-align: middle;">
                <div style="color: #ffc24b; font-size: 21px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.1;">
                  EliteCruit
                </div>
                <div style="color: rgba(255, 255, 255, 0.78); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.8px; margin-top: 2px;">
                  Digital Recruitment Platform
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.22); color: #f8fbff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.5px;">
                  ${badgeText}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Main Body -->
        <div style="padding: 30px 28px 26px;">
          <h2 style="margin: 0 0 14px; color: #0b2340; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">
            ${headline}
          </h2>

          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
            Hello <strong>${greetingName || "there"}</strong>,
          </p>

          <p style="color: #475569; font-size: 14.5px; line-height: 1.6; margin: 0 0 24px;">
            ${introText}
          </p>

          ${
            code
              ? `
          <div style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 0 0 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #05386f; margin-bottom: 8px;">
              6-Digit Verification Code
            </div>
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 9px; color: #0b2340; display: inline-block; padding-left: 9px;">
              ${code}
            </span>
            <div style="color: #64748b; font-size: 12px; margin-top: 10px; font-weight: 600;">
              ⏱ ${codeSubtext}
            </div>
          </div>
          `
              : ""
          }

          ${highlightBoxHtml}

          <p style="color: #64748b; font-size: 13px; line-height: 1.55; margin: 0;">
            ${footerNote}
          </p>

          ${actionButtonHtml}
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
          <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            Philippine Nationwide • Digital Recruitment Platform
          </div>
          <div style="color: #94a3b8; font-size: 11px;">
            &copy; ${year} EliteCruit. All rights reserved. • Automated Security Notification
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Internal dispatcher that sends via Brevo HTTPS API, SMTP fallback, or console log.
 */
async function dispatchEmail({ toEmail, recipientName = "User", subject, htmlContent, textContent, logTag = "EMAIL" }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const transporter = getTransporter();

  // 1. Primary Production Method: Brevo HTTPS REST API (Port 443)
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || "zakiablando897@gmail.com";
      const cleanSenderEmail = senderEmail.includes("<") ? senderEmail.match(/<([^>]+)>/)?.[1] || senderEmail : senderEmail;

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "EliteCruit Security", email: cleanSenderEmail.trim() },
          to: [{ email: toEmail.trim(), name: recipientName || "User" }],
          subject,
          htmlContent,
          textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[${logTag} Brevo API Error] HTTP status:`, response.status, errorData);
        return { success: true, method: "brevo_api_failed" };
      }

      console.log(`[${logTag} Success] Sent via Brevo HTTPS API to ${toEmail}`);
      return { success: true, method: "brevo_api" };
    } catch (err) {
      console.error(`[${logTag} Brevo API Error] Network request failed:`, err?.message || err);
    }
  }

  // 2. Secondary Method: Standard SMTP Transport (Nodemailer)
  if (transporter) {
    const fromAddress = process.env.SMTP_FROM || `"EliteCruit Security" <noreply@elitecruit.com>`;

    try {
      const sendPromise = transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email dispatch timed out after 5s")), 5000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      return { success: true, method: "smtp" };
    } catch (err) {
      console.error(`[${logTag} SMTP Error] Failed to send email:`, err?.message || err);
      return { success: true, method: "console_fallback" };
    }
  }

  return { success: true, method: "console" };
}

/**
 * Sends a 2FA / Email Verification Code to the specified email address.
 */
export async function send2FAEmail(toEmail, code, recipientName = "User") {
  console.log("\n=======================================================================");
  console.log(`🔒 [ELITECRUIT VERIFICATION CODE]`);
  console.log(`   Recipient: ${toEmail}`);
  console.log(`   Verification Code: ${code}`);
  console.log(`   Valid For: 10 minutes`);
  console.log("=======================================================================\n");

  const htmlContent = buildEliteCruitEmailTemplate({
    badgeText: "Verification",
    headline: "Verify Your EliteCruit Account",
    greetingName: recipientName,
    introText: "Please use the 6-digit security verification code below to verify your email address and continue securely on EliteCruit:",
    code,
    codeSubtext: "Valid for 10 minutes • Do not share this code with anyone",
  });

  const textContent = `Your EliteCruit verification code is: ${code}. This code expires in 10 minutes. If you did not request this, please secure your account.`;

  return dispatchEmail({
    toEmail,
    recipientName,
    subject: `${code} is your EliteCruit verification code`,
    htmlContent,
    textContent,
    logTag: "2FA Email",
  });
}

/**
 * Sends a 6-digit Password Reset OTP code to the user's registered email address.
 */
export async function sendPasswordResetEmail(toEmail, code, recipientName = "User") {
  console.log("\n=======================================================================");
  console.log(`🔑 [ELITECRUIT PASSWORD RESET CODE]`);
  console.log(`   Recipient: ${toEmail}`);
  console.log(`   Reset Code: ${code}`);
  console.log(`   Valid For: 10 minutes`);
  console.log("=======================================================================\n");

  const htmlContent = buildEliteCruitEmailTemplate({
    badgeText: "Password Reset",
    headline: "Password Reset Request",
    greetingName: recipientName,
    introText: "We received a request to reset the password for your EliteCruit account. Enter the 6-digit security code below on the password recovery screen to set a new password:",
    code,
    codeSubtext: "This reset code expires in 10 minutes",
    footerNote: "If you did not request a password reset, no changes have been made to your account. You can safely ignore this message.",
  });

  const textContent = `Your EliteCruit password reset code is: ${code}. This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.`;

  return dispatchEmail({
    toEmail,
    recipientName,
    subject: `${code} is your EliteCruit password reset code`,
    htmlContent,
    textContent,
    logTag: "Password Reset Email",
  });
}

/**
 * Sends an automated security alert email when a user's account password is changed.
 */
export async function sendPasswordChangedNotificationEmail(toEmail, recipientName = "User") {
  const timestamp = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });

  console.log("\n=======================================================================");
  console.log(`🛡️ [ELITECRUIT PASSWORD CHANGE ALERT]`);
  console.log(`   Recipient: ${toEmail}`);
  console.log(`   Changed At: ${timestamp} (PHT)`);
  console.log("=======================================================================\n");

  const highlightBoxHtml = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 18px; margin: 0 0 22px;">
      <div style="color: #166534; font-size: 13.5px; font-weight: 700; margin-bottom: 6px;">
        ✓ Password Successfully Updated
      </div>
      <div style="color: #15803d; font-size: 12.5px; line-height: 1.5;">
        <strong>Account:</strong> ${toEmail}<br />
        <strong>Time:</strong> ${timestamp} (Philippine Standard Time)
      </div>
    </div>
  `;

  const baseUrl = (process.env.FRONTEND_URL || "https://elitecruit.onrender.com")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  const resetUrl = `${baseUrl}/login?action=forgot&email=${encodeURIComponent(toEmail)}`;

  const actionButtonHtml = `
    <div style="text-align: center; margin-top: 22px;">
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #1f3a4b 0%, #0b2f53 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 9px; border: 1px solid #1e4976; box-shadow: 0 4px 12px rgba(11, 47, 83, 0.2);">
        Reset Password Immediately &rarr;
      </a>
    </div>
  `;

  const htmlContent = buildEliteCruitEmailTemplate({
    badgeText: "Security Alert",
    headline: "Your Password Was Changed",
    greetingName: recipientName,
    introText: "This is a confirmation that the password for your EliteCruit account was recently changed.",
    highlightBoxHtml,
    footerNote: "If you made this change, no further action is needed. If you did NOT authorize this password change, please reset your password immediately using the button below:",
    actionButtonHtml,
  });

  const textContent = `Security Alert: Your EliteCruit password for ${toEmail} was changed on ${timestamp} (PHT). If you did not make this change, reset your password immediately at: ${resetUrl}`;

  return dispatchEmail({
    toEmail,
    recipientName,
    subject: "Security Alert: Your EliteCruit password was changed",
    htmlContent,
    textContent,
    logTag: "Password Change Alert",
  });
}
