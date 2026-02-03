import { createFileRoute } from "@tanstack/react-router";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { AppHeader } from "@/components/ui/app-header";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { createOnboardingContentNode } from "@/components/ui/onboarding-content-node";
import { localFormCollection } from "@/db-collections";
import { useLocalForm } from "@/hooks/use-live-hooks";
import { guestMiddleware } from "@/middleware/auth";
import { RightSidebar } from "@/components/footer";

const LOCAL_FORM_ID = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID for local draft
const LOCAL_WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440001"; // Valid UUID for local workspace

// Initial state for new forms
const onboardingValue = normalizeNodeId([
	createFormHeaderNode({ title: "hello" }) as unknown as TElement,
	createOnboardingContentNode() as unknown as TElement,
	{
		children: [{ text: "" }],
		type: "p",
	},
]);

export const Route = createFileRoute("/")({
	server: {
		middleware: [guestMiddleware],
	},
	component: RouteComponent,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function RouteComponent() {
	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<AppHeader />
			<div className="flex-1 overflow-auto relative bg-background">
				<LocalEditorApp />
			</div>
		</div>
	);
}

function LocalEditorApp() {
	const { data: savedDocs } = useLocalForm(LOCAL_FORM_ID);

	const initializedRef = useRef(false);
	const [isReady, setIsReady] = useState(false);
	const skipSaveRef = useRef(false);

	const editor = usePlateEditor({
		plugins: EditorKit,
	});

	const lastSavedContentRef = useRef<Value | null>(null);

	useEffect(() => {
		if (initializedRef.current) return;
		if (savedDocs === undefined) return;

		initializedRef.current = true;

		const docData = savedDocs?.[0];
		let initialContent: Value;

		if (docData?.content && Array.isArray(docData.content)) {
			initialContent = docData.content as Value;
		} else {
			initialContent = onboardingValue;
		}

		lastSavedContentRef.current = initialContent;
		skipSaveRef.current = true;

		editor.tf.init({
			value: initialContent,
		});

		setIsReady(true);
	}, [savedDocs, editor]);

	const handleChange = useCallback(({ value }: { value: Value }) => {
		// Skip the initial onChange triggered by editor.tf.init()
		if (skipSaveRef.current) {
			skipSaveRef.current = false;
			return;
		}

		// Only save if content actually changed
		const contentStr = JSON.stringify(value);
		const lastSavedStr = JSON.stringify(lastSavedContentRef.current);
		if (contentStr === lastSavedStr) return;

		lastSavedContentRef.current = value;

		// Persist to local collection
		const headerNode = value.find((n: any) => n.type === "formHeader") as any;
		const updateData = {
			content: value,
			title: headerNode?.title || "Draft Form",
			icon: headerNode?.icon || null,
			cover: headerNode?.cover || null,
			updatedAt: new Date().toISOString(),
		};

		try {
			localFormCollection.update(LOCAL_FORM_ID, (draft) => {
				Object.assign(draft, updateData);
			});
		} catch {
			localFormCollection.insert({
				id: LOCAL_FORM_ID,
				workspaceId: LOCAL_WORKSPACE_ID,
				formName: "draft",
				schemaName: "draftFormSchema",
				isMultiStep: false,
				status: "draft" as const,
				createdAt: new Date().toISOString(),
				...updateData,
			});
		}
	}, []);

	if (!isReady) return <Loader />;

	return (
		<div className="flex h-screen w-full bg-background selection:bg-blue-500/20">
			   <main className="flex-1 overflow-y-auto">
			<Plate editor={editor} readOnly={false} onChange={handleChange}>
				<EditorContainer
					variant="default"
					className="px-0 sm:px-0 max-w-full mx-auto border-none shadow-none"
					>
					<Editor className="overflow-x-visible" />
				</EditorContainer>
			</Plate>					
			</main>
			<RightSidebar />
		</div>
	);
}
