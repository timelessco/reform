import { eq, or, useLiveQuery } from "@tanstack/react-db";
import {
	editorDocCollection,
	formCollection,
	localFormCollection,
	workspaceCollection,
} from "@/db-collections";

/**
 * Custom hook for real-time workspaces sync.
 */
export const useWorkspaces = () => {
	const { data: workspacesData } = useLiveQuery((q) =>
		q.from({ ws: workspaceCollection }).select(({ ws }) => ({
			id: ws.id,
			organizationId: ws.organizationId,
			createdByUserId: ws.createdByUserId,
			name: ws.name,
			createdAt: ws.createdAt,
			updatedAt: ws.updatedAt,
		})),
	);
	return workspacesData;
};

/**
 * Custom hook for real-time workspace sync by ID.
 */
export const useWorkspace = (workspaceId?: string) => {
	const { data: workspaceData } = useLiveQuery((q) => {
		let query = q.from({ ws: workspaceCollection });
		if (workspaceId) {
			query = query.where(({ ws }) => eq(ws.id, workspaceId));
		}
		return query.select(({ ws }) => ({
			id: ws.id,
			organizationId: ws.organizationId,
			createdByUserId: ws.createdByUserId,
			name: ws.name,
			createdAt: ws.createdAt,
			updatedAt: ws.updatedAt,
		}));
	});
	return workspaceData?.[0];
};

/**
 * Custom hook for real-time forms sync filtered by workspace ID.
 */
export const useFormsForWorkspace = (workspaceId?: string) => {
	const { data: formsData } = useLiveQuery((q) => {
		let query = q.from({ form: formCollection });
		if (workspaceId) {
			query = query.where(({ form }) => eq(form.workspaceId, workspaceId));
		}
		// Only fetch forms that are not archived
		query = query.where(({ form }) =>
			or(eq(form.status, "draft"), eq(form.status, "published")),
		);

		return query.select(({ form }) => ({
			id: form.id,
			title: form.title,
			workspaceId: form.workspaceId,
			status: form.status,
			updatedAt: form.updatedAt,
		}));
	});
	return formsData;
};

/**
 * Custom hook for real-time forms sync.
 */
export const useForms = () => {
	const { data: formsData } = useLiveQuery((q) =>
		q
			.from({ form: formCollection })
			.where(({ form }) =>
				or(eq(form.status, "draft"), eq(form.status, "published")),
			)
			.select(({ form }) => ({
				id: form.id,
				title: form.title,
				workspaceId: form.workspaceId,
				status: form.status,
				updatedAt: form.updatedAt,
			})),
	);
	return formsData;
};

/**
 * Custom hook for real-time form sync by ID.
 */
export const useForm = (formId?: string) => {
	const { data: savedDocs } = useLiveQuery((q) => {
		let query = q.from({ doc: editorDocCollection });
		if (formId) {
			query = query.where(({ doc }) => eq(doc.id, formId));
		}
		return query;
	});
	return savedDocs;
};

/**
 * Custom hook for real-time local form draft sync by ID.
 */
export const useLocalForm = (formId?: string) => {
	const { data: savedDocs } = useLiveQuery((q) => {
		let query = q.from({ doc: localFormCollection });
		if (formId) {
			query = query.where(({ doc }) => eq(doc.id, formId));
		}
		return query;
	});
	return savedDocs;
};
