import { notFound } from "@tanstack/react-router";
import { and, count, eq } from "drizzle-orm";
import { customDomains, forms, formVersions, submissions } from "@/db/schema";
import { db } from "@/db";
import type { PublicFormSettings } from "@/types/form-settings";

/** Known app hostnames that should never be treated as custom domains */
const APP_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Patterns for app-owned hostnames (e.g. *.vercel.app deployments) */
const APP_HOST_PATTERNS = [/\.vercel\.app$/];

/**
 * Extract the user-facing host from a Headers object, preferring
 * `x-forwarded-host` (set by Vercel/proxies) over the raw `host` header.
 * Accepts the native Headers instance returned by TanStack Start's
 * getRequestHeaders() — NOT a plain object.
 */
export const getRequestHost = (headers: Headers): string =>
  headers.get("x-forwarded-host") ?? headers.get("host") ?? headers.get(":authority") ?? "";

/**
 * Returns true when the Host header belongs to the app itself
 * (localhost, Vercel previews, etc.) — NOT a custom domain.
 */
export const isAppHost = (host: string): boolean => {
  const hostname = host.split(":")[0]; // strip port
  if (APP_HOSTS.has(hostname)) return true;
  if (process.env.APP_DOMAIN && hostname === process.env.APP_DOMAIN) return true;
  return APP_HOST_PATTERNS.some((re) => re.test(hostname));
};

export interface DomainMeta {
  siteTitle: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

interface ResolvedDomain {
  id: string;
  organizationId: string;
  domain: string;
  siteTitle: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

/**
 * Look up a verified custom domain by hostname.
 * Throws notFound() if no matching verified domain exists.
 */
export const resolveCustomDomain = async (host: string): Promise<ResolvedDomain> => {
  const hostname = host.split(":")[0]; // strip port

  const [domain] = await db
    .select({
      id: customDomains.id,
      organizationId: customDomains.organizationId,
      domain: customDomains.domain,
      siteTitle: customDomains.siteTitle,
      faviconUrl: customDomains.faviconUrl,
      ogImageUrl: customDomains.ogImageUrl,
    })
    .from(customDomains)
    .where(and(eq(customDomains.domain, hostname), eq(customDomains.status, "verified")));

  if (!domain) {
    throw notFound();
  }

  return domain;
};

/**
 * Dev-friendly fallback: when the request is from an app host (localhost,
 * Vercel preview), look up the custom domain assigned to a form by slug.
 * Lets developers preview custom-domain forms without simulating the host.
 */
export const resolveDomainForSlug = async (slug: string): Promise<ResolvedDomain> => {
  const [row] = await db
    .select({
      id: customDomains.id,
      organizationId: customDomains.organizationId,
      domain: customDomains.domain,
      siteTitle: customDomains.siteTitle,
      faviconUrl: customDomains.faviconUrl,
      ogImageUrl: customDomains.ogImageUrl,
    })
    .from(customDomains)
    .innerJoin(forms, eq(forms.customDomainId, customDomains.id))
    .where(
      and(
        eq(forms.slug, slug),
        eq(forms.status, "published"),
        eq(customDomains.status, "verified"),
      ),
    );

  if (!row) {
    throw notFound();
  }

  return row;
};

/**
 * Load a published form that belongs to a specific custom domain's organization.
 *
 * @param domain - resolved custom domain record
 * @param value  - the slug or form UUID to look up
 * @param lookupBy - whether `value` is a "slug" or "id"
 */
export const loadFormForCustomDomain = async (
  domain: ResolvedDomain,
  value: string,
  lookupBy: "slug" | "id",
) => {
  // Build the WHERE clause based on lookup type
  const conditions =
    lookupBy === "slug"
      ? and(
          eq(forms.slug, value),
          eq(forms.customDomainId, domain.id),
          eq(forms.status, "published"),
        )
      : and(
          eq(forms.id, value),
          eq(forms.customDomainId, domain.id),
          eq(forms.status, "published"),
        );

  const [form] = await db
    .select({
      id: forms.id,
      status: forms.status,
      icon: forms.icon,
      cover: forms.cover,
      lastPublishedVersionId: forms.lastPublishedVersionId,
      draftTitle: forms.title,
      draftContent: forms.content,
      progressBar: forms.progressBar,
      branding: forms.branding,
      autoJump: forms.autoJump,
      saveAnswersForLater: forms.saveAnswersForLater,
      redirectOnCompletion: forms.redirectOnCompletion,
      redirectUrl: forms.redirectUrl,
      redirectDelay: forms.redirectDelay,
      language: forms.language,
      passwordProtect: forms.passwordProtect,
      closeForm: forms.closeForm,
      closedFormMessage: forms.closedFormMessage,
      closeOnDate: forms.closeOnDate,
      closeDate: forms.closeDate,
      limitSubmissions: forms.limitSubmissions,
      maxSubmissions: forms.maxSubmissions,
      preventDuplicateSubmissions: forms.preventDuplicateSubmissions,
    })
    .from(forms)
    .where(conditions);

  if (!form) {
    throw notFound();
  }

  const settings: PublicFormSettings = {
    progressBar: form.progressBar,
    branding: false, // custom domains always hide branding
    autoJump: form.autoJump,
    saveAnswersForLater: form.saveAnswersForLater,
    redirectOnCompletion: form.redirectOnCompletion,
    redirectUrl: form.redirectUrl,
    redirectDelay: form.redirectDelay,
    language: form.language,
    passwordProtect: form.passwordProtect,
    closeForm: form.closeForm,
    closedFormMessage: form.closedFormMessage,
    closeOnDate: form.closeOnDate,
    closeDate: form.closeDate,
    limitSubmissions: form.limitSubmissions,
    maxSubmissions: form.maxSubmissions,
    preventDuplicateSubmissions: form.preventDuplicateSubmissions,
  };

  // --- Gating checks (same logic as getPublishedFormById) ---
  if (settings.closeForm) {
    return {
      form: null,
      error: null,
      gated: {
        type: "closed" as const,
        message: settings.closedFormMessage || "This form is now closed.",
      },
      domainMeta: buildDomainMeta(domain),
    };
  }

  if (settings.closeOnDate && settings.closeDate && new Date(settings.closeDate) < new Date()) {
    return {
      form: null,
      error: null,
      gated: {
        type: "date_expired" as const,
        message: settings.closedFormMessage || "This form is no longer accepting responses.",
      },
      domainMeta: buildDomainMeta(domain),
    };
  }

  if (settings.limitSubmissions && settings.maxSubmissions) {
    const [{ value: submissionCount }] = await db
      .select({ value: count() })
      .from(submissions)
      .where(eq(submissions.formId, form.id));
    if (submissionCount >= settings.maxSubmissions) {
      return {
        form: null,
        error: null,
        gated: {
          type: "limit_reached" as const,
          message: "This form has reached its maximum number of submissions.",
        },
        domainMeta: buildDomainMeta(domain),
      };
    }
  }

  const gated = settings.passwordProtect
    ? { type: "password_required" as const, message: null }
    : null;

  // If form has a published version, use version content
  if (form.lastPublishedVersionId) {
    const [version] = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.id, form.lastPublishedVersionId));

    if (version) {
      return {
        form: {
          id: form.id,
          title: version.title,
          content: version.content as object[],
          customization: (version.customization ?? {}) as Record<string, string>,
          icon: form.icon,
          cover: form.cover,
          status: form.status,
          settings,
        },
        error: null,
        gated,
        domainMeta: buildDomainMeta(domain),
      };
    }
  }

  // Fallback for forms without versions
  return {
    form: {
      id: form.id,
      title: form.draftTitle,
      content: form.draftContent as object[],
      customization: {} as Record<string, string>,
      icon: form.icon,
      cover: form.cover,
      status: form.status,
      settings,
    },
    error: null,
    gated: null,
    domainMeta: buildDomainMeta(domain),
  };
};

const buildDomainMeta = (domain: ResolvedDomain): DomainMeta => ({
  siteTitle: domain.siteTitle,
  faviconUrl: domain.faviconUrl,
  ogImageUrl: domain.ogImageUrl,
});
