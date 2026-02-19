import { Resend } from "resend";
import { logger } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Better Forms <noreply@share.recollect.so>";

export async function sendOTPEmail(email: string, otp: string, type: string) {
  // type: "sign-in" | "email-verification" | "forget-password"
  const subject =
    type === "email-verification"
      ? "Verify your email"
      : type === "forget-password"
        ? "Reset your password"
        : "Sign in to Better Forms";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">${subject}</h2>
				<p style="font-size: 16px; color: #555;">Your verification code is:</p>
				<p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #000; margin: 24px 0;">${otp}</p>
				<p style="font-size: 14px; color: #888;">This code expires in 5 minutes.</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="font-size: 12px; color: #999;">If you didn't request this code, you can safely ignore this email.</p>
			</div>
		`,
  });

  if (error) {
    logger("[Email] Failed to send OTP:", error);
  }
}

export async function sendOrgInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  inviteLink: string,
) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `You're invited to join ${orgName}`,
    html: `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #333;">You're invited!</h2>
				<p style="font-size: 16px; color: #555;">
					<strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Better Forms.
				</p>
				<p style="font-size: 16px; color: #555; margin-top: 24px;">
					<a href="${inviteLink}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Accept Invitation</a>
				</p>
				<p style="font-size: 14px; color: #666; margin-top: 16px;">Or copy this link:</p>
				<p style="font-size: 14px; color: #0066cc; word-break: break-all;">${inviteLink}</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="font-size: 12px; color: #999;">If you weren't expecting this invitation, you can safely ignore this email.</p>
			</div>
		`,
  });

  if (error) {
    logger("[Email] Failed to send invitation:", error);
  }
}

export async function sendFormSubmissionNotification(
  to: string,
  formTitle: string,
  submissionId: string,
  data: Record<string, unknown>,
) {
  // Build a simple key-value HTML table from submission data
  const rows = Object.entries(data)
    .map(
      ([key, value]) =>
        `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 500; color: #333;">${escapeHtml(key)}</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555;">${escapeHtml(String(value ?? ""))}</td></tr>`,
    )
    .join("");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New submission: ${formTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New form submission</h2>
        <p style="font-size: 16px; color: #555;">
          You received a new response for <strong>${escapeHtml(formTitle)}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          ${rows}
        </table>
        <p style="font-size: 12px; color: #999;">Submission ID: ${submissionId}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">You're receiving this because you enabled email notifications for this form.</p>
      </div>
    `,
  });

  if (error) {
    logger("[Email] Failed to send submission notification:", error);
  }
}

export async function sendRespondentConfirmation(to: string, subject: string, body: string) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="font-size: 16px; color: #333; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(body)}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">This email was sent via Better Forms.</p>
      </div>
    `,
  });

  if (error) {
    logger("[Email] Failed to send respondent confirmation:", error);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
