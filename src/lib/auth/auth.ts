import * as schema from "@/db/schema";
import { db } from "@/db";
import {
  sendChangeEmailConfirmationEmail,
  sendMagicLinkEmail,
  sendOrgInvitationEmail,
} from "@/integrations/email";
import { logger } from "@/lib/utils";
import { APP_NAME } from "@/lib/config/app-config";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "@better-auth/api-key";
import { magicLink, organization, testUtils } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: "sandbox", // TODO: Change to production
});

const getServerBaseURL = () => {
  const url = process.env.BETTER_AUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
};

export const auth = betterAuth({
  baseURL: getServerBaseURL(),
  appName: APP_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  // experimental : {
  //   joins: true,
  // },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async (data) => {
        logger(`[Auth] Sending change email confirmation to ${data.user.email} → ${data.newEmail}`);
        if (import.meta.env.DEV) {
          logger(`[Auth] Change email URL: ${data.url}`);
        } else {
          void sendChangeEmailConfirmationEmail(data.user.email, data.newEmail, data.url);
        }
      },
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
            const orgName = user.name || user.email.split("@")[0];
            const [org] = await db
              .insert(schema.organization)
              .values({
                id: orgId,
                name: orgName,
                slug: user.id,
                createdAt: now,
              })
              .returning();

            // Add user as owner and create default workspace in parallel
            await Promise.all([
              db.insert(schema.member).values({
                id: crypto.randomUUID(),
                userId: user.id,
                organizationId: org.id,
                role: "owner",
                createdAt: now,
              }),
              db.insert(schema.workspaces).values({
                id: crypto.randomUUID(),
                organizationId: org.id,
                createdByUserId: user.id,
                name: "My workspace",
                createdAt: now,
                updatedAt: now,
              }),
            ]);

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
  trustedOrigins: [
    "https://*.vercel.app",
    "https://*.vercel-preview-app",
    "https://localhost:3001",
  ],
  plugins: [
    ...(process.env.NODE_ENV === "test" ? [testUtils()] : []),
    magicLink({
      async sendMagicLink({ email, url }) {
        if (import.meta.env.DEV) {
          logger(`[Auth] Magic link for ${email}: ${url}`);
        } else {
          await sendMagicLinkEmail(email, url);
        }
      },
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
          secret: process.env.POLAR_WEBHOOK_SECRET ?? "",
        }),
      ],
    }),
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
