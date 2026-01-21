import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	apiKey,
	emailOTP,
	organization,
	twoFactor,
	username,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { logger } from "@/lib/utils";

const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN!,
	server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
	appName: "Better Forms",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		autoSignIn: true,
	},
	emailVerification: {
		autoSignInAfterVerification: true,
		afterEmailVerification: async () => {
			logger("[Auth] Email verified");
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					try {
						// Create organization
						await db
							.insert(schema.organization)
							.values({
								id: crypto.randomUUID(),
								name: user.name,
								slug: user.id,
								createdAt: new Date(),
							})
							.returning()
							.then(async ([org]) => {
								// Add user as owner/admin of the organization
								await db.insert(schema.member).values({
									id: crypto.randomUUID(),
									userId: user.id,
									organizationId: org.id,
									role: "owner",
									createdAt: new Date(),
								});
								logger(
									`[Auth] Created organization "${user.name}" for user ${user.email}`,
								);
							});
					} catch (error) {
						logger(
							`[Auth] Failed to create organization for user ${user.email}:`,
							error,
						);
					}
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					const [membership] = await db
						.select()
						.from(schema.member)
						.where(eq(schema.member.userId, session.userId))
						.limit(1);

					if (membership) {
						return {
							data: {
								...session,
								activeOrganizationId: membership.organizationId,
							},
						};
					}
					return { data: session };
				},
			},
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
	trustedOrigins: ["https://*.vercel.app", "https://*.vercel-preview-app"],
	plugins: [
		username(),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				logger(`[Auth] Sending OTP to ${email}: ${otp} (type: ${type})`);
			},
			otpLength: 6,
			expiresIn: 300,
			sendVerificationOnSignUp: true,
		}),
		twoFactor(),
		apiKey(),
		organization({
			async sendInvitationEmail(data) {
				logger(
					`[Org] Invitation sent to ${data.email} for org "${data.organization.name}" by ${data.inviter.user.name}`,
				);
			},
		}),
		polar({
			client: polarClient,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						{
							productId: "398f06f7-a6f6-4f65-80b6-62e38bd2825c",
							slug: "free",
						},
						{
							productId: "0be62924-d418-4dcc-8c8c-2b4929f76695",
							slug: "Pro-(Yearly)",
						},
						{
							productId: "3662224a-d998-4a73-bf82-4957198d53ea",
							slug: "Pro",
						},
					],
					successUrl:
						(process.env.APP_URL || "http://localhost:3000") +
						"/settings/billing?checkout_id={CHECKOUT_ID}",
					authenticatedUsersOnly: true,
				}),
				portal(),
				webhooks({
					secret: process.env.POLAR_WEBHOOK_SECRET!,
				}),
			],
		}),
		tanstackStartCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
