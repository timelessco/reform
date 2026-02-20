import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { electricFetchClient, getElectricUrl, timestampField } from "./shared";

// ============================================================================
// Form Version Schema (read-only — versions are immutable, created by server fns)
// ============================================================================

const FormVersionSchema = z.object({
  id: z.string(),
  formId: z.string(),
  version: z.coerce.number(),
  content: z.array(z.any()),
  settings: z.record(z.string(), z.any()),
  title: z.string(),
  publishedByUserId: z.string(),
  publishedAt: timestampField,
  createdAt: timestampField,
});

export type FormVersion = z.infer<typeof FormVersionSchema>;

// ============================================================================
// Collection with ElectricSQL sync (read-only — no onInsert/onUpdate/onDelete)
// ============================================================================

export const formVersionCollection = createCollection(
  electricCollectionOptions({
    id: "form_versions",
    schema: FormVersionSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "form_versions" },
      fetchClient: electricFetchClient,
    },
    getKey: (item) => item.id,
    startSync: false,
    syncMode: "eager",
  }),
);
