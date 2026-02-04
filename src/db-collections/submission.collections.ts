import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { electricFetchClient, getElectricUrl, timestampField } from "./shared";

// ============================================================================
// Submission Schema
// ============================================================================

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  data: z.record(z.string(), z.any()).default({}),
  isCompleted: z.boolean().default(true),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Submission = z.infer<typeof SubmissionSchema>;

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
    },
    getKey: (item) => item.id,
  }),
);
