import type { InitialQueryBuilder } from "@tanstack/db";
import { formListingsDescriptor } from "./form-listing";

/**
 * The org's form list as the sidebar and dashboard render it.
 *
 * This config object is consumed twice by design: the `_authenticated` loader preloads it
 * against the request's `DbClient` and dehydrates the ordered result, and `useOrgForms`
 * hands the same config to `useLiveQuery`. Both sides build the identical query IR over
 * the same descriptor, so their hashes match and the browser's first render reads the
 * hydrated snapshot instead of refetching.
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
