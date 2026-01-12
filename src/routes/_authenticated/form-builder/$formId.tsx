import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { Value } from "platejs";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { editorDocCollection } from "@/db-collections";
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";

const EditorApp = lazy(() => import("./-components/editor-app"));

export const Route = createFileRoute("/_authenticated/form-builder/$formId")({
	validateSearch: z.object({
		demo: z.boolean().optional(),
	}),
	component: RouteComponent,
	ssr: false,
});

function RouteComponent() {
	const { formId } = Route.useParams();
	const { demo } = Route.useSearch();

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<AppHeader formId={formId} />
			<div className="flex flex-1 overflow-hidden">
				<main className="flex-1 overflow-auto relative bg-background">
					<Suspense
						fallback={
							<div className="h-full w-full flex items-center justify-center">
								Loading...
							</div>
						}
					>
						{demo ? (
							<PreviewMode formId={formId} />
						) : (
							<EditorApp formId={formId} />
						)}
					</Suspense>
				</main>
				<CustomizeSidebar />
			</div>
		</div>
	);
}

function PreviewMode({ formId }: { formId: string }) {
	const { data: savedDocs } = useLiveQuery((q) =>
		q
			.from({ doc: editorDocCollection })
			.where(({ doc }) => eq(doc.id, formId)),
	);

	const doc = savedDocs?.[0];
	const content = (doc?.content as Value) || [];

	if (savedDocs !== undefined && savedDocs.length === 0) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-lg font-medium mb-2">Form Not Found</h2>
					<p className="text-sm text-muted-foreground mb-4">
						This form does not exist or has been deleted.
					</p>
					<Link to="/dashboard">
						<Button>Back to Dashboard</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (!doc) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				Loading...
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full py-12 px-4">
			<FormPreviewFromPlate
				content={content}
				title={doc.title}
				icon={doc.icon}
				cover={doc.cover}
			/>
		</div>
	);
}
