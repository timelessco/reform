import {
  recordFormVisit,
  recordQuestionProgress,
  updateFormVisit,
} from "@/lib/server-fn/analytics";

type RecordVisitArgs = {
  formId: string;
  visitorHash: string;
  sessionId: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

type UpdateVisitArgs = {
  visitId: string;
  didStartForm?: boolean;
  didSubmit?: boolean;
  submissionId?: string | null;
  visitEndedAt?: string | null;
  durationMs?: number | null;
};

type QuestionProgressArgs = {
  visitId: string;
  formId: string;
  visitorHash: string;
  questionId: string;
  questionType?: string | null;
  questionIndex: number;
  event: "view" | "start" | "complete";
  wasLastQuestion?: boolean;
};

/** Fires recordFormVisit and resolves with the visitId, or null on bot/error. */
export const fireRecordVisit = async (args: RecordVisitArgs): Promise<string | null> => {
  try {
    const result = await recordFormVisit({ data: args });
    return result.visitId;
  } catch {
    return null;
  }
};

/** Fire-and-forget visit update. Underlying fetch survives short async work; not unload-safe. */
export const fireUpdateVisit = (args: UpdateVisitArgs): void => {
  void updateFormVisit({ data: args }).catch(() => {
    // Analytics never breaks the form.
  });
};

/** Beacon variant for unload-time use. Falls back to fire-and-forget fetch when sendBeacon is unavailable. */
export const fireUpdateVisitBeacon = (args: UpdateVisitArgs): void => {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    fireUpdateVisit(args);
    return;
  }
  const beaconUrl = (updateFormVisit as unknown as { url?: string }).url;
  if (beaconUrl) {
    try {
      const blob = new Blob([JSON.stringify({ data: args })], {
        type: "application/json",
      });
      const sent = navigator.sendBeacon(beaconUrl, blob);
      if (sent) {
        return;
      }
    } catch {
      // Fall through to fetch fallback.
    }
  }
  fireUpdateVisit(args);
};

/** Fire-and-forget question-progress event. */
export const fireQuestionProgress = (args: QuestionProgressArgs): void => {
  void recordQuestionProgress({ data: args }).catch(() => {
    // Analytics never breaks the form.
  });
};
