import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { sendOrgInvitationEmail, sendOTPEmail } from "@/lib/email";
import { logger } from "@/lib/utils";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, emailOTP, organization, twoFactor, username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: "sandbox", // TODO: Change to production
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
            const now = new Date();
            const orgId = crypto.randomUUID();

            // Create organization
            const [org] = await db
              .insert(schema.organization)
              .values({
                id: orgId,
                name: user.name,
                slug: user.id,
                createdAt: now,
              })
              .returning();

            // Add user as owner/admin of the organization
            await db.insert(schema.member).values({
              id: crypto.randomUUID(),
              userId: user.id,
              organizationId: org.id,
              role: "owner",
              createdAt: now,
            });

            // Create default workspace for the organization
            await db.insert(schema.workspaces).values({
              id: crypto.randomUUID(),
              organizationId: org.id,
              createdByUserId: user.id,
              name: "My workspace",
              createdAt: now,
              updatedAt: now,
            });

            logger(
              `[Auth] Created organization "${user.name}" with default workspace for user ${user.email}`,
            );
          } catch (error) {
            logger(`[Auth] Failed to create organization for user ${user.email}:`, error);
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
        logger(`[Auth] Sending OTP to ${email} (type: ${type})`);
        void sendOTPEmail(email, otp, type);
      },
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOnSignUp: true,
    }),
    twoFactor({
      totpOptions : {
        digits : 6,
      }
    }),
    apiKey(),
    organization({
      async sendInvitationEmail(data) {
        logger(
          `[Org] sendInvitationEmail callback START - email: ${data.email}, org: ${data.organization.name}, inviter: ${data.inviter.user.name}, invitationId: ${data.id}`,
        );
        const inviteLink = `${process.env.APP_URL || "http://localhost:3000"}/accept-invite?invitationId=${data.id}`;
        logger(`[Org] Generated invite link: ${inviteLink}`);
        void sendOrgInvitationEmail(
          data.email,
          data.organization.name,
          data.inviter.user.name,
          inviteLink,
        );
        logger(`[Org] sendInvitationEmail callback END`);
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
