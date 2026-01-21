import { createFileRoute } from '@tanstack/react-router'
import { useLocalForm } from "@/hooks/use-live-hooks";
import { ClientOnly } from "@/components/client-only";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { localFormCollection } from "@/db-collections";
import { AppHeader } from "@/components/ui/app-header";
import { guestMiddleware } from "@/middleware/auth";

const LOCAL_FORM_ID = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID for local draft
const LOCAL_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440001'; // Valid UUID for local workspace

const defaultValue = normalizeNodeId([
	createFormHeaderNode() as unknown as TElement,
	{
		children: [{ text: "Start building your form..." }],
		type: "p",
	},
]);

export const Route = createFileRoute('/create')({
	server: {
		middleware: [guestMiddleware],
	},
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<AppHeader />
			<div className="flex-1 overflow-auto relative bg-background">
				<ClientOnly
					fallback={
						<div className="h-full w-full flex items-center justify-center">
							Loading editor...
						</div>
					}
				>
					<LocalEditorApp />
				</ClientOnly>
			</div>
		</div>
	);
}

function LocalEditorApp() {
	const savedDocs = useLocalForm(LOCAL_FORM_ID);

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
			if (
				docData.content.length > 0 &&
				docData.content[0]?.type === "formHeader"
			) {
				initialContent = docData.content as Value;
			} else {
				// Add formHeader at index 0 with data from doc metadata
				initialContent = [
					createFormHeaderNode({
						title: docData.title || "",
						icon: docData.icon || null,
						cover: docData.cover || null,
					}) as unknown as TElement,
					...(docData.content as Value),
				];
			}
		} else {
			initialContent = defaultValue;
		}

		lastSavedContentRef.current = initialContent;
		skipSaveRef.current = true;

		editor.tf.init({
			value: initialContent,
			autoSelect: "end",
		});

		setIsReady(true);
	}, [savedDocs, editor]);

	const handleChange = useCallback(
		({ value }: { value: Value }) => {
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

			// Check if the first element is a formHeader
			if (value.length > 0 && value[0]?.type === 'formHeader') {
				const headerNode = value[0] as any;
				try {
					localFormCollection.update(LOCAL_FORM_ID, (draft) => {
						draft.title = headerNode.title || "Draft Form";
						draft.icon = headerNode.icon || null;
						draft.cover = headerNode.cover || null;
						draft.content = value;
						draft.updatedAt = new Date().toISOString();
					});
				} catch {
					// If update fails (item doesn't exist), create it
					localFormCollection.insert({
						id: LOCAL_FORM_ID,
						workspaceId: LOCAL_WORKSPACE_ID, // Valid UUID for local workspace
						title: headerNode.title || "Draft Form",
						formName: "draft",
						schemaName: "draftFormSchema",
						content: value,
						icon: headerNode.icon || null,
						cover: headerNode.cover || null,
						isMultiStep: false,
						status: "draft" as const,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					});
				}
			} else {
				// Update the full content
				try {
					localFormCollection.update(LOCAL_FORM_ID, (draft) => {
						draft.content = value;
						draft.updatedAt = new Date().toISOString();
					});
				} catch {
					// If update fails (item doesn't exist), create it
					localFormCollection.insert({
						id: LOCAL_FORM_ID,
						workspaceId: LOCAL_WORKSPACE_ID, // Valid UUID for local workspace
						title: "Draft Form",
						formName: "draft",
						schemaName: "draftFormSchema",
						content: value,
						icon: null,
						cover: null,
						isMultiStep: false,
						status: "draft" as const,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					});
				}
			}
		},
		[],
	);

	if (!isReady) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				Loading editor...
			</div>
		);
	}

	return (
		<div className="h-screen w-full overflow-y-auto">
			<Plate editor={editor} readOnly={false} onChange={handleChange}>
				<EditorContainer
					variant="default"
					className="px-0 sm:px-0 max-w-full mx-auto border-none shadow-none"
				>
					<Editor className="overflow-x-visible" />
				</EditorContainer>
			</Plate>
		</div>
	);
}
