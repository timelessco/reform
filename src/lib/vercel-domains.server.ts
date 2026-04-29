import { VercelCore } from "@vercel/sdk/core.js";
import { domainsDeleteDomain } from "@vercel/sdk/funcs/domainsDeleteDomain.js";
import { projectsAddProjectDomain } from "@vercel/sdk/funcs/projectsAddProjectDomain.js";
import { projectsGetProjectDomain } from "@vercel/sdk/funcs/projectsGetProjectDomain.js";
import { projectsRemoveProjectDomain } from "@vercel/sdk/funcs/projectsRemoveProjectDomain.js";
import { projectsVerifyProjectDomain } from "@vercel/sdk/funcs/projectsVerifyProjectDomain.js";

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
}

export interface VercelDomainStatus {
  verified: boolean;
  verification?: VercelDomainVerification[];
}

let cachedClient: VercelCore | undefined;
const getClient = (): VercelCore => {
  if (!cachedClient) {
    cachedClient = new VercelCore({ bearerToken: process.env.VERCEL_TOKEN });
  }
  return cachedClient;
};

let cachedProjectId: string | undefined;
const getProjectId = (): string => {
  if (cachedProjectId) return cachedProjectId;
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID is not set");
  cachedProjectId = id;
  return id;
};

const teamId = (): string | undefined => process.env.VERCEL_TEAM_ID || undefined;

const NOT_FOUND_RE = /not.?found|404/i;

// VercelError exposes the raw HTTP body as a string (Content-Type from the
// Vercel API isn't always application/json, so the SDK doesn't auto-parse).
type ParsedErrorBody = {
  error?: { message?: string; verification?: VercelDomainVerification[] };
};

const parseErrorBody = (error: unknown): ParsedErrorBody | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const body = (error as { body?: unknown }).body;
  if (typeof body !== "string" || body.length === 0) return undefined;
  try {
    return JSON.parse(body) as ParsedErrorBody;
  } catch {
    return undefined;
  }
};

const extractVerificationFromError = (error: unknown): VercelDomainVerification[] | undefined => {
  const verification = parseErrorBody(error)?.error?.verification;
  return Array.isArray(verification) ? verification : undefined;
};

const errorMessage = (error: unknown, fallback: string): string => {
  const message = parseErrorBody(error)?.error?.message;
  if (message) return message;
  if (error instanceof Error) return error.message;
  return fallback;
};

export const vercelDomains = {
  async add(domain: string): Promise<VercelDomainStatus & { domain: string }> {
    const result = await projectsAddProjectDomain(getClient(), {
      idOrName: getProjectId(),
      teamId: teamId(),
      requestBody: { name: domain },
    });

    if (!result.ok) {
      // Vercel returns the verification challenge inline when a domain is
      // already attached to another team — surface it instead of throwing so
      // the UI can render TXT _vercel instructions.
      const verification = extractVerificationFromError(result.error);
      if (verification?.length) {
        return { domain, verified: false, verification };
      }
      throw new Error(errorMessage(result.error, "Failed to add domain to Vercel"));
    }

    const { value } = result;
    return {
      domain: value.name ?? domain,
      verified: value.verified ?? false,
      verification: value.verification,
    };
  },

  async check(domain: string): Promise<VercelDomainStatus> {
    const result = await projectsGetProjectDomain(getClient(), {
      idOrName: getProjectId(),
      teamId: teamId(),
      domain,
    });
    if (!result.ok) {
      throw new Error(errorMessage(result.error, "Failed to check domain status"));
    }
    return {
      verified: result.value.verified ?? false,
      verification: result.value.verification,
    };
  },

  async verify(domain: string): Promise<VercelDomainStatus> {
    const result = await projectsVerifyProjectDomain(getClient(), {
      idOrName: getProjectId(),
      teamId: teamId(),
      domain,
    });
    if (!result.ok) {
      throw new Error(errorMessage(result.error, "Failed to verify domain"));
    }
    // The verify endpoint only reports verified; callers needing the TXT
    // challenge should fall back to check().
    return { verified: result.value.verified ?? false };
  },

  /**
   * Project-level disassociation only. The domain stops resolving on this
   * project but remains on the team, so a later re-add (e.g. plan re-upgrade)
   * skips re-verification. Use for downgrade/suspend flows.
   */
  async detach(domain: string): Promise<void> {
    const result = await projectsRemoveProjectDomain(getClient(), {
      idOrName: getProjectId(),
      teamId: teamId(),
      domain,
    });
    if (!result.ok) {
      // The SDK doesn't expose a status code on the Result error directly;
      // tolerate "not found" by message inspection.
      const message = errorMessage(result.error, "Failed to detach domain from project");
      if (NOT_FOUND_RE.test(message)) return;
      throw new Error(message);
    }
  },

  /**
   * Full removal: project-detach + account-level delete. Use for permanent
   * tenant offboarding.
   */
  async remove(domain: string): Promise<void> {
    await this.detach(domain);

    const result = await domainsDeleteDomain(getClient(), {
      domain,
      teamId: teamId(),
    });
    if (!result.ok) {
      const message = errorMessage(result.error, "Failed to delete domain from account");
      if (NOT_FOUND_RE.test(message)) return;
      throw new Error(message);
    }
  },
};
