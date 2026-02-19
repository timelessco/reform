import {
	createOptimisticAction,
	createTransaction,
	eq,
	useLiveQuery,
} from "@tanstack/react-db";
import md5 from "md5";
import { useMemo } from "react";
import { formCollection, formVersionCollection } from "@/db-collections";
import {
	discardFormChanges,
	publishFormVersion,
	restoreFormVersion,
} from "@/lib/fn/form-versions";
import {
	clearEditorDraftSnapshot,
	getEditorDraftSnapshot,
	setEditorDraftSnapshot,
} from "@/lib/editor-draft-snapshots";
import { useForm } from "./use-live-hooks";

/**
 * Hook to get list of published versions for a form (Electric-synced)
 */
export function useFormVersions(formId: string | undefined) {
	return useLiveQuery(
		(q) => {
			if (!formId) return null as any;
			return q
				.from({ v: formVersionCollection })
				.where(({ v }) => eq(v.formId, formId))
				.orderBy(({ v }) => v.version, "desc");
		},
		[formId],
	);
}

/**
 * Hook to get full content of a specific version (Electric-synced)
 */
export function useFormVersionContent(versionId: string | undefined) {
	return useLiveQuery(
		(q) => {
			if (!versionId) return null as any;
			return q
				.from({ v: formVersionCollection })
				.where(({ v }) => eq(v.id, versionId));
		},
		[versionId],
	);
}

/**
 * Hook to detect if the current draft has unpublished changes.
 * Compares current content hash with the last published hash.
 */
export function useHasUnpublishedChanges(formId: string | undefined) {
	const { data: formData } = useForm(formId);
	const { data: versions } = useFormVersions(formId);

	const form = useMemo(() => {
		if (!formId || !formData) return undefined;
		return formData.find((f: any) => f.id === formId);
	}, [formData, formId]);

	const latestVersion = versions?.[0];

	return useMemo(() => {
		if (!form || !formId) return false;
		if (!form.publishedContentHash) return false;

		const draftSnapshot = getEditorDraftSnapshot(formId);
		const effectiveContent = draftSnapshot?.content ?? form.content;

		const currentCanonical = canonicalizeContent(effectiveContent);
		const currentHash = computeContentHash(effectiveContent);
		if (currentHash === form.publishedContentHash) {
			publishedContentCanonicalSnapshots.set(formId, currentCanonical);
			return false;
		}

		const localPublishedCanonical =
			publishedContentCanonicalSnapshots.get(formId);
		if (
			localPublishedCanonical &&
			currentCanonical === localPublishedCanonical
		) {
			return false;
		}

		// Fallback for structural drift (e.g. regenerated Plate node ids):
		// treat content as unchanged if semantic content matches latest published snapshot.
		if (
			latestVersion &&
			isSemanticallyEqual(effectiveContent, latestVersion.content)
		) {
			publishedContentCanonicalSnapshots.set(
				formId,
				canonicalizeContent(latestVersion.content),
			);
			return false;
		}

		return true;
	}, [form, latestVersion, formId]);
}

// ============================================================================
// Optimistic Actions (replace useMutation hooks)
// ============================================================================

function computeContentHash(content: unknown) {
	return md5(JSON.stringify(content));
}

function canonicalizeContent(content: unknown) {
	return JSON.stringify(stripVolatileKeys(content));
}

function isSemanticallyEqual(left: unknown, right: unknown) {
	return canonicalizeContent(left) === canonicalizeContent(right);
}

function stripVolatileKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => stripVolatileKeys(item));
	}

	if (value && typeof value === "object") {
		const obj = value as Record<string, unknown>;

		const cleanedEntries = Object.entries(obj)
			.filter(([key]) => key !== "id")
			.toSorted(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => [key, stripVolatileKeys(item)]);

		return Object.fromEntries(cleanedEntries);
	}

	return value;
}

const publishedContentCanonicalSnapshots = new Map<string, string>();

export const publishFormAction = createOptimisticAction<{ formId: string }>({
	onMutate: ({ formId }) => {
		const draftSnapshot = getEditorDraftSnapshot(formId);
		const form = formCollection.state.get(formId);
		const effectiveContent = draftSnapshot?.content ?? form?.content;
		if (effectiveContent) {
			publishedContentCanonicalSnapshots.set(
				formId,
				canonicalizeContent(effectiveContent),
			);
		}
	},
	mutationFn: async ({ formId }) => {
		const form = formCollection.state.get(formId);
		if (!form) {
			throw new Error("Form not found in local state");
		}

		const draftSnapshot = getEditorDraftSnapshot(formId);
		const effectiveContent = Array.isArray(draftSnapshot?.content)
			? draftSnapshot.content
			: form.content;
		const effectiveTitle = draftSnapshot?.title ?? form.title;

		const result = await publishFormVersion({
			data: {
				formId,
				content: effectiveContent,
				title: effectiveTitle,
				settings: form.settings,
			},
		});

		if (typeof result?.txid === "number") {
			await formCollection.utils.awaitTxId(result.txid);
			if (result.createdVersion) {
				await formVersionCollection.utils.awaitTxId(result.txid);
			}
		}

		const latest = formCollection.state.get(formId);
		if (latest?.content) {
			publishedContentCanonicalSnapshots.set(
				formId,
				canonicalizeContent(latest.content),
			);
			setEditorDraftSnapshot(formId, {
				content: latest.content as unknown[],
				title: latest.title,
			});
		} else {
			setEditorDraftSnapshot(formId, {
				content: effectiveContent,
				title: effectiveTitle,
			});
		}

		return result;
	},
});

export const restoreVersionAction = createOptimisticAction<{
	formId: string;
	versionId: string;
}>({
	onMutate: ({ formId, versionId }) => {
		const version = formVersionCollection.state.get(versionId);
		if (!version) return;

		const tx = createTransaction({ mutationFn: async () => {} });
		tx.mutate(() => {
			formCollection.update(formId, (draft) => {
				draft.content = version.content;
				draft.title = version.title;
			});
		});
		setEditorDraftSnapshot(formId, {
			content: version.content,
			title: version.title,
		});
	},
	mutationFn: async ({ formId, versionId }) => {
		const result = await restoreFormVersion({ data: { formId, versionId } });
		const version = result?.version;
		if (version) {
			const tx = createTransaction({ mutationFn: async () => {} });
			tx.mutate(() => {
				formCollection.update(formId, (draft) => {
					draft.content = version.content;
					draft.title = version.title;
				});
			});
			setEditorDraftSnapshot(formId, {
				content: version.content,
				title: version.title,
			});
		}
		return result;
	},
});

export const discardChangesAction = createOptimisticAction<{ formId: string }>({
	onMutate: ({ formId }) => {
		const form = formCollection.state.get(formId);
		if (!form?.lastPublishedVersionId) return;

		const version = formVersionCollection.state.get(
			form.lastPublishedVersionId,
		);
		if (!version) return;

		const tx = createTransaction({ mutationFn: async () => {} });
		tx.mutate(() => {
			formCollection.update(formId, (draft) => {
				draft.content = version.content;
				draft.title = version.title;
				draft.publishedContentHash = computeContentHash(version.content);
			});
		});
		publishedContentCanonicalSnapshots.set(
			formId,
			canonicalizeContent(version.content),
		);
		setEditorDraftSnapshot(formId, {
			content: version.content,
			title: version.title,
		});
	},
	mutationFn: async ({ formId }) => {
		const result = await discardFormChanges({ data: { formId } });
		const version = result?.version;
		if (version) {
			const tx = createTransaction({ mutationFn: async () => {} });
			tx.mutate(() => {
				formCollection.update(formId, (draft) => {
					draft.content = version.content;
					draft.title = version.title;
					draft.publishedContentHash = computeContentHash(version.content);
				});
			});
			setEditorDraftSnapshot(formId, {
				content: version.content,
				title: version.title,
			});
		}
		return result;
	},
});

export async function discardChanges(formId: string) {
	const result = await discardFormChanges({ data: { formId } });
	const version = result?.version;

	if (version) {
		const tx = createTransaction({ mutationFn: async () => {} });
		tx.mutate(() => {
			formCollection.update(formId, (draft) => {
				draft.content = version.content;
				draft.title = version.title;
				draft.publishedContentHash = computeContentHash(version.content);
			});
		});
		publishedContentCanonicalSnapshots.set(
			formId,
			canonicalizeContent(version.content),
		);
		setEditorDraftSnapshot(formId, {
			content: version.content,
			title: version.title,
		});
	} else {
		clearEditorDraftSnapshot(formId);
	}

	return result;
}
