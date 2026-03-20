import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { electricFetchClient, getElectricUrl, handleElectricError, timestampField } from "./shared";

// ============================================================================
// Submission Schema
// ============================================================================

const SubmissionSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  data: z.record(z.string(), z.any()).default({}),
  isCompleted: z.boolean().default(true),
  createdAt: timestampField,
  updatedAt: timestampField,
});

type _Submission = z.infer<typeof SubmissionSchema>;

// ============================================================================
// Collection with ElectricSQL sync
// ============================================================================

export const submissionCollection = createCollection(
  electricCollectionOptions({
    id: "submissions",
    schema: SubmissionSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "submissions" },
      fetchClient: electricFetchClient,
      onError: handleElectricError,
      parser: {
        timestamptz: (date: string) => date,
        timestamp: (date: string) => date,
      },
    },
    getKey: (item) => item.id,
    startSync: false, // Sync starts in _authenticated.tsx loader after auth is confirmed
    syncMode: "progressive",
  }),
);
