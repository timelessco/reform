import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { authMiddleware } from "@/middleware/auth";

/**
 * Server-only: fetches org data with request headers for SSR.
 * Used by _authenticated loader - must stay in server fn to preserve client boundary.
 */
export const getOrgDataForLayout = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const headers = getRequestHeaders();
    const [activeOrg, orgsData] = await Promise.all([
      auth.api.getFullOrganization({ headers }),
      auth.api.listOrganizations({ headers }),
    ]);
    return { activeOrg, orgsData };
  });

/** Query options for org layout data - use with ensureQueryData in loaders */
export const orgDataForLayoutQueryOptions = () =>
  queryOptions({
    queryKey: ["org-data-for-layout"] as const,
    queryFn: () => getOrgDataForLayout(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
