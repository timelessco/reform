import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import EditorApp from "../-components/editor-app";
import { PreviewMode } from "../-components/preview-mode";

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId/",
)({
	component: DesignPage,
	loader: async ({ context, params }) => {
		const data = await context.queryClient.ensureQueryData({
			...getFormbyIdQueryOption(params.formId),
			revalidateIfStale: true,
		});
		return { initialContent: data.form.content };
	},
});

function DesignPage() {
	const { workspaceId, formId } = Route.useParams();
	const loaderData = Route.useLoaderData();
	const initialContent = loaderData?.initialContent || [];
	const search: any = useSearch({ strict: false });
	const demo = search.demo;

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
	);
}
