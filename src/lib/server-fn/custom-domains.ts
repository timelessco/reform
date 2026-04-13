import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { customDomains, forms, member } from "@/db/schema";
import { db } from "@/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { vercelDomains } from "@/lib/vercel-domains";
import { DOMAIN_LIMITS } from "@/lib/config/plan-config";

const serializeDomain = (domain: typeof customDomains.$inferSelect) => ({
  ...domain,
  createdAt: domain.createdAt.toISOString(),
  updatedAt: domain.updatedAt.toISOString(),
});

export const listOrgDomains = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ orgId: z.string() }))
  .handler(async ({ data, context }) => {
    // Verify caller belongs to the org
    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(eq(member.userId, context.session.user.id), eq(member.organizationId, data.orgId)),
      );

    if (!membership) {
      throw new Error("Not authorized to view domains for this organization");
    }

    const domains = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.organizationId, data.orgId));

    return domains.map(serializeDomain);
  });

export const addDomain = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      orgId: z.string(),
      domain: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    // Check user is org owner
    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, context.session.user.id),
          eq(member.organizationId, data.orgId),
          eq(member.role, "owner"),
        ),
      );

    if (!membership) {
      throw new Error("Only organization owners can add domains");
    }

    // Check domain count limit
    const existingDomains = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.organizationId, data.orgId));

    if (existingDomains.length >= DOMAIN_LIMITS.maxDomainsPerOrg) {
      throw new Error(`Maximum of ${DOMAIN_LIMITS.maxDomainsPerOrg} domains per organization`);
    }

    // Add domain to Vercel
    let vercelDomainId: string | undefined;
    let vercelFailed = false;
    try {
      const vercelResult = await vercelDomains.add(data.domain);
      vercelDomainId = vercelResult.domain;
    } catch {
      vercelFailed = true;
    }

    const now = new Date();
    const [domain] = await db
      .insert(customDomains)
      .values({
        id: crypto.randomUUID(),
        organizationId: data.orgId,
        domain: data.domain,
        status: vercelFailed ? "failed" : "pending",
        vercelDomainId: vercelDomainId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      ...serializeDomain(domain),
      warning: vercelFailed
        ? "Domain saved but Vercel registration failed. You can retry verification later."
        : undefined,
    };
  });

export const removeDomain = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ domainId: z.string() }))
  .handler(async ({ data, context }) => {
    // Look up the domain
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.id, data.domainId));

    if (!domain) {
      throw new Error("Domain not found");
    }

    // Check user is org owner
    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, context.session.user.id),
          eq(member.organizationId, domain.organizationId),
          eq(member.role, "owner"),
        ),
      );

    if (!membership) {
      throw new Error("Only organization owners can remove domains");
    }

    // Remove from Vercel
    try {
      await vercelDomains.remove(domain.domain);
    } catch {
      // Continue with DB cleanup even if Vercel fails
    }

    // Clear customDomainId on all forms and delete domain atomically
    await db.transaction(async (tx) => {
      await tx
        .update(forms)
        .set({ customDomainId: null })
        .where(eq(forms.customDomainId, data.domainId));

      await tx.delete(customDomains).where(eq(customDomains.id, data.domainId));
    });

    return { success: true };
  });

export const checkDomainStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ domainId: z.string() }))
  .handler(async ({ data, context }) => {
    // Look up domain
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.id, data.domainId));

    if (!domain) {
      throw new Error("Domain not found");
    }

    // Verify org ownership
    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, context.session.user.id),
          eq(member.organizationId, domain.organizationId),
        ),
      );

    if (!membership) {
      throw new Error("Not authorized to check this domain");
    }

    // Check with Vercel
    let vercelStatus: {
      verified: boolean;
      verification?: { type: string; domain: string; value: string }[];
    };

    try {
      vercelStatus = await vercelDomains.check(domain.domain);
    } catch {
      // If Vercel check fails, mark as failed
      const [updated] = await db
        .update(customDomains)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(customDomains.id, data.domainId))
        .returning();

      return {
        ...serializeDomain(updated),
        verification: undefined,
      };
    }

    const newStatus = vercelStatus.verified ? "verified" : "pending";
    const [updated] = await db
      .update(customDomains)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(customDomains.id, data.domainId))
      .returning();

    return {
      ...serializeDomain(updated),
      verification: vercelStatus.verification,
    };
  });

export const updateDomainMeta = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      domainId: z.string(),
      siteTitle: z.string().optional(),
      faviconUrl: z.string().optional(),
      ogImageUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    // Look up domain
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.id, data.domainId));

    if (!domain) {
      throw new Error("Domain not found");
    }

    // Check user is org owner
    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, context.session.user.id),
          eq(member.organizationId, domain.organizationId),
          eq(member.role, "owner"),
        ),
      );

    if (!membership) {
      throw new Error("Only organization owners can update domain settings");
    }

    const { domainId, ...updateFields } = data;
    const [updated] = await db
      .update(customDomains)
      .set({ ...updateFields, updatedAt: new Date() })
      .where(eq(customDomains.id, domainId))
      .returning();

    return serializeDomain(updated);
  });

export const getDomainByHost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ host: z.string() }))
  .handler(async ({ data }) => {
    const [domain] = await db
      .select({
        id: customDomains.id,
        domain: customDomains.domain,
        siteTitle: customDomains.siteTitle,
        faviconUrl: customDomains.faviconUrl,
        ogImageUrl: customDomains.ogImageUrl,
      })
      .from(customDomains)
      .where(and(eq(customDomains.domain, data.host), eq(customDomains.status, "verified")));

    if (!domain) {
      return null;
    }

    return domain;
  });

export const orgDomainsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["org-domains", orgId],
    queryFn: () => listOrgDomains({ data: { orgId } }),
    staleTime: 1000 * 60 * 5,
  });
