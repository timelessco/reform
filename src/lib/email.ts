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

export async function sendOrgInvitationEmail(email: string, orgName: string, inviterName: string) {
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
				<p style="font-size: 14px; color: #555; margin-top: 24px;">
					Sign in to your account to accept the invitation.
				</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="font-size: 12px; color: #999;">If you weren't expecting this invitation, you can safely ignore this email.</p>
			</div>
		`,
  });

  if (error) {
    logger("[Email] Failed to send invitation:", error);
  }
}
