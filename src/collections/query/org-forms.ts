import type { InitialQueryBuilder } from "@tanstack/db";
import { formListingsDescriptor } from "./form-listing";

/**
 * The org's form list as the sidebar and dashboard render it.
 *
 * Descriptor-backed, so any `DbClient` can materialize it: `useOrgForms` renders it, and
 * a server preload of the same config hashes identically, so a dehydrated snapshot would
 * serve the browser's first render. `_authenticated` does not preload it: that route is
 * `ssr: "data-only"`, and its `form-listings` ensure already warms the browser cache.
 */
export const orgFormsLiveQueryOptions = () => ({
  query: (q: InitialQueryBuilder) =>
    q
      .from({ form: formListingsDescriptor })
      .select(({ form }) => ({
        id: form.id,
        title: form.title,
        workspaceId: form.workspaceId,
        status: form.status,
        updatedAt: form.updatedAt,
        createdAt: form.createdAt,
        icon: form.icon,
        cover: form.cover,
        previewImageUrl: form.previewImageUrl,
        customization: form.customization,
        sortIndex: form.sortIndex,
      }))
      .orderBy(({ form }) => form.updatedAt, "desc"),
});
