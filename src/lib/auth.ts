import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, emailOTP, twoFactor, username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
	appName: "Better Forms",
	// experimental: { joins: true },
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
	plugins: [
		username(),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				// For development, log to console
				// In production, replace with your email service (e.g., Resend, SendGrid, etc.)
				console.log(`[Auth] Sending OTP to ${email}: ${otp} (type: ${type})`);

				// Example with Resend (uncomment and configure):
				// import { Resend } from 'resend';
				// const resend = new Resend(process.env.RESEND_API_KEY);
				// await resend.emails.send({
				//   from: 'noreply@yourdomain.com',
				//   to: email,
				//   subject: type === 'sign-in' ? 'Sign In OTP' :
				//            type === 'email-verification' ? 'Verify Your Email' :
				//            'Reset Your Password',
				//   text: `Your verification code is: ${otp}`,
				// });
			},
			otpLength: 6,
			expiresIn: 300, // 5 minutes
			sendVerificationOnSignUp: true,
		}),
		twoFactor(),
		apiKey(),
		tanstackStartCookies(), // Must be last plugin
	],
});

export type Session = typeof auth.$Infer.Session;
