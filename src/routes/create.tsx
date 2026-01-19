import { createFileRoute } from "@tanstack/react-router";
    import { useCollectionContext } from "@/providers/collection-provider";
import { DRAFT_FORM_ID } from "@/services/form.service";
import EditorApp from "@/routes/_authenticated/form-builder/-components/editor-app";

export const Route = createFileRoute("/create")({
	component: CreateFormPage,
});

function CreateFormPage() {
	const { isReady } = useCollectionContext();

	// Wait for collections to be ready before rendering the editor
	if (!isReady) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				Loading...
			</div>
		);
	}

	return <EditorApp formId={DRAFT_FORM_ID} />;
}
