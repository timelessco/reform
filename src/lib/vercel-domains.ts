const VERCEL_API = "https://api.vercel.com";

const vercelHeaders = () => ({
  Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "Content-Type": "application/json",
});

const teamQuery = () => (process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "");

export const vercelDomains = {
  async add(domain: string): Promise<{ domain: string; verified: boolean }> {
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
    return res.json();
  },

  async check(domain: string): Promise<{
    verified: boolean;
    verification?: { type: string; domain: string; value: string }[];
  }> {
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

  async remove(domain: string): Promise<void> {
    const res = await fetch(`${VERCEL_API}/v6/domains/${domain}${teamQuery()}`, {
      method: "DELETE",
      headers: vercelHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to remove domain from Vercel");
    }
  },
};
