import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "@/db";
import { formVisits } from "@/db/schema";
import { isBotUserAgent } from "@/lib/analytics/bot-filter";
import { parseUserAgent } from "@/lib/analytics/parse-user-agent";

export const recordFormVisit = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      visitorHash: z.string().min(1).max(128),
      sessionId: z.string().min(1).max(128),
      referrer: z.string().nullish(),
      utmSource: z.string().nullish(),
      utmMedium: z.string().nullish(),
      utmCampaign: z.string().nullish(),
    }),
  )
  .handler(async ({ data }): Promise<{ visitId: string | null }> => {
    const headers = getRequestHeaders();
    const ua = (headers["user-agent"] as string | undefined) ?? null;

    if (isBotUserAgent(ua)) {
      return { visitId: null };
    }

    const parsed = parseUserAgent(ua);
    const country = (headers["x-vercel-ip-country"] as string | undefined) ?? null;

    const id = crypto.randomUUID();
    await db.insert(formVisits).values({
      id,
      formId: data.formId,
      visitorHash: data.visitorHash,
      sessionId: data.sessionId,
      referrer: data.referrer ?? null,
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      browserVersion: parsed.browserVersion,
      os: parsed.os,
      osVersion: parsed.osVersion,
      country,
      // v1: store ISO code only; localized country names can be added later via a lookup table.
      countryName: null,
      city: null,
      region: null,
    });

    return { visitId: id };
  });
