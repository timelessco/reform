import { createFileRoute, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { useForm } from "@/hooks/use-live-hooks";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import EditorApp from "../-components/editor-app";
import { PreviewMode } from "../-components/preview-mode";

export const Route = createFileRoute(
	'/_authenticated/workspace/$workspaceId/form-builder/$formId/edit',
)({
	validateSearch: z.object({
		demo: z.boolean().optional(),
		force: z.boolean().optional(), // When true, skip redirect for published forms
	}),
	component: DesignPage,
	// beforeLoad: async ({ context, params }) => {
	// 	console.log('[edit.tsx beforeLoad] Starting with params:', params);
	// 	let data;
	// 	try {
	// 		data = await context.queryClient.ensureQueryData({
	// 			...getFormbyIdQueryOption(params.formId),
	// 			revalidateIfStale: true,
	// 		})
	// 		console.log('[edit.tsx beforeLoad] Form data fetched:', {
	// 			status: data?.form?.status,
	// 			formId: data?.form?.id,
	// 		});
	// 	} catch (error) {
	// 		console.error('[edit.tsx beforeLoad] Error fetching form:', error);
	// 		return { formStatus: 'unknown' };
	// 	}

	// 	const status = data?.form?.status;
	// 	console.log('[edit.tsx beforeLoad] Checking status:', status);

	// 	if (status === 'published') {
	// 		console.log('[edit.tsx beforeLoad] Form is published, redirecting to share...');
	// 		throw redirect({
	// 			to: '/workspace/$workspaceId/form-builder/$formId/share',
	// 			params: {
	// 				workspaceId: params.workspaceId,
	// 				formId: params.formId
	// 			}
	// 		});
	// 	}

	// 	console.log('[edit.tsx beforeLoad] Form is draft, continuing to edit page');
	// 	return { formStatus: status };
	// },
	loader: async ({ context, params }) => {
		try {
			const data = await context.queryClient.ensureQueryData({
				...getFormbyIdQueryOption(params.formId),
				revalidateIfStale: true,
			})
			return { initialContent: data.form.content };
		} catch (_error) {
			// Form may not exist on server yet (local-first sync in progress)
			// Return empty content - the EditorApp will use local data from Electric
			return { initialContent: [] };
		}
	},
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function DesignPage() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	// Extract formId from pathname to ensure it's always current
	const formIdFromPath = pathname.split('/form-builder/')[1]?.split('/')[0] || '';
	const { workspaceId } = Route.useParams();
	const formId = formIdFromPath || Route.useParams().formId;

	// Use local Electric data to check form status (more up-to-date than server)
	const { data: localFormData, isReady } = useForm(formId);
	const localForm = localFormData?.[0];
	const localStatus = localForm?.status;

	console.log('[edit.tsx DesignPage] Local form status check:', {
		formId,
		localStatus,
		isReady,
		localForm: localForm ? { id: localForm.id, title: localForm.title, status: localForm.status } : null,
	});

	const loaderData = Route.useLoaderData();
	const initialContent = loaderData?.initialContent || [];
	const search: any = useSearch({ strict: false });
	const demo = search.demo;
	// Check if user explicitly wants to edit (force param from Edit button)
	const forceEdit = search.force === true;

	// Redirect to share page if form is published (using local Electric data)
	// BUT skip redirect if user explicitly clicked "Edit" button (force=true)
	useEffect(() => {
		if (isReady && localStatus === 'published' && !forceEdit) {
			console.log('[edit.tsx DesignPage] Form is published locally, redirecting to share...');
			navigate({
				to: '/workspace/$workspaceId/form-builder/$formId/share',
				params: { workspaceId, formId },
				replace: true, // Replace history entry so back button doesn't loop
			});
		}
	}, [isReady, localStatus, formId, workspaceId, navigate, forceEdit]);

	// Show loader while checking form status
	if (!isReady) {
		return <Loader />;
	}

	// If form is published and not forcing edit, show loader while redirecting
	if (localStatus === 'published' && !forceEdit) {
		return <Loader />;
	}

	return (
		<div className="flex flex-1 h-full overflow-hidden">
			<main className="flex-1 overflow-auto relative bg-background">
				{demo ? (
					<PreviewMode formId={formId} workspaceId={workspaceId} />
				) : (
					<EditorApp
						key={formId}
						formId={formId}
						workspaceId={workspaceId}
						defaultValue={initialContent}
					/>
				)}
			</main>
			<CustomizeSidebar />
		</div>
	)
}
