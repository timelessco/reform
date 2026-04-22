const VERCEL_API = "https://api.vercel.com";

const vercelHeaders = () => ({
  Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "Content-Type": "application/json",
});

const teamQuery = () => (process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "");

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
}

export interface VercelDomainStatus {
  verified: boolean;
  verification?: VercelDomainVerification[];
}

export const vercelDomains = {
  async add(domain: string): Promise<VercelDomainStatus & { domain: string }> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery()}`, {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to add domain to Vercel");
    }
    const data = await res.json();
    return {
      domain: data.name ?? data.domain ?? domain,
      verified: data.verified ?? false,
      verification: data.verification,
    };
  },

  async check(domain: string): Promise<VercelDomainStatus> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`,
      { headers: vercelHeaders() },
    );
    if (!res.ok) {
      throw new Error("Failed to check domain status");
    }
    return res.json();
  },

  async verify(domain: string): Promise<VercelDomainStatus> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}/verify${teamQuery()}`,
      { method: "POST", headers: vercelHeaders() },
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to verify domain");
    }
    return res.json();
  },

  async remove(domain: string): Promise<void> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`,
      { method: "DELETE", headers: vercelHeaders() },
    );
    // 404 means the domain isn't attached — treat as success.
    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message ?? "Failed to remove domain from Vercel");
    }
  },
};
