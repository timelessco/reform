import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { getRequestHost } from "@/lib/server-fn/custom-domain-loader";

// Thin stubs: both handlers dynamically import `./custom-domain-view-rsc.impl`
// so platejs/BaseEditorKit/EditorStatic never reach the client bundle via
// Start's server-fn transform. Mirror the pattern used by
// `public-form-view-rsc.tsx` on the app-domain route.

export const getCustomDomainFormByIdRSC = createServerFn({ method: "GET" })
  .inputValidator(z.object({ formId: z.uuid() }))
  .handler(async ({ data }) => {
    const host = getRequestHost(getRequestHeaders());
    const { runCustomDomainByIdRSC } = await import("./custom-domain-view-rsc.impl");
    return runCustomDomainByIdRSC(data, host);
  });

export const getCustomDomainFormBySlugRSC = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const host = getRequestHost(getRequestHeaders());
    const { runCustomDomainBySlugRSC } = await import("./custom-domain-view-rsc.impl");
    return runCustomDomainBySlugRSC(data, host);
  });
