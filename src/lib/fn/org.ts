import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth/auth";
/**
 * Server-only: fetches org data with request headers for SSR.
 * Used by _authenticated loader - must stay in server fn to preserve client boundary.
 * Auth is handled by the route's authMiddleware — no need to re-validate session here.
 */
export const getOrgDataForLayout = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const [activeOrg, orgsData] = await Promise.all([
    auth.api.getFullOrganization({ headers }),
    auth.api.listOrganizations({ headers }),
  ]);

  // If no active org but user has orgs, activate the first one server-side
  // This avoids client-side setActive loops (e.g. after magic link login)
  if (!activeOrg && orgsData && orgsData.length > 0) {
    const activated = await auth.api.setActiveOrganization({
      headers,
      body: { organizationId: orgsData[0].id },
    });
    if (activated) {
      const freshActiveOrg = await auth.api.getFullOrganization({ headers });
      return { activeOrg: freshActiveOrg, orgsData };
    }
  }

  return { activeOrg, orgsData };
});

/** Query options for org layout data - use with ensureQueryData in loaders */
export const orgDataForLayoutQueryOptions = () =>
  queryOptions({
    queryKey: ["org-data-for-layout"] as const,
    queryFn: () => getOrgDataForLayout(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
