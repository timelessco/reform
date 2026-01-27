import { EditorKit } from "@/components/editor/editor-kit";
import { Button } from "@/components/ui/button";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { updateDoc, updateHeader } from "@/db-collections";
import { useForm } from "@/hooks/use-live-hooks";
import { Link } from "@tanstack/react-router";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface EditorAppProps {
	formId: string;
	workspaceId?: string;
	defaultValue?: ReturnType<typeof normalizeNodeId>;
}

const DEFAULT_EDITOR_VALUE = normalizeNodeId([
	createFormHeaderNode() as unknown as TElement,
	{
		children: [{ text: "" }],
		type: "p",
	},
	createFormButtonNode("submit") as unknown as TElement,
]);

export default function EditorApp({ formId, workspaceId, defaultValue }: EditorAppProps) {
	const { data: savedDocs } = useForm(formId);
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
		if (savedDocs.length === 0) return; // Wait for form data to be available

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

			// Migration: ensure Submit button exists for existing forms
			const hasSubmitButton = initialContent.some(
				(node: TElement) =>
					node.type === "formButton" && node.buttonRole === "submit"
			);
			if (!hasSubmitButton) {
				// Find the position to insert Submit (before thank-you pageBreak if exists, otherwise at end)
				const thankYouIndex = initialContent.findIndex(
					(node: TElement) =>
						node.type === "pageBreak" && node.isThankYouPage === true
				);
				const insertIndex =
					thankYouIndex !== -1 ? thankYouIndex : initialContent.length;
				initialContent = [
					...initialContent.slice(0, insertIndex),
					createFormButtonNode("submit") as unknown as TElement,
					...initialContent.slice(insertIndex),
				];
			}
		} else {
			initialContent = defaultValue ?? DEFAULT_EDITOR_VALUE;
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
			const now = new Date().toISOString()

			// Always update the full content when it changes
			updateDoc(formId, (draft) => {
				draft.workspaceId = workspaceId,
					draft.createdAt = now,
					draft.updatedAt = now,
					draft.content = value;
			});

			// Optionally update header metadata if the first element is a formHeader
			if (value.length > 0 && value[0]?.type === 'formHeader') {
				const headerNode = value[0] as any;
				updateHeader(formId, {
					title: headerNode.title,
					icon: headerNode.icon,
					cover: headerNode.cover,
					workspaceId: String(workspaceId),
					createdAt: now,
					updatedAt: now,
				});
			}
		},
		[formId, workspaceId],
	);

	// Preview mode is handled by route search params, not stored in DB
	const isPreview = false;

	if (!isReady) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				Loading editor...
			</div>
		);
	}

	// Only show "Form Not Found" after we've confirmed the form doesn't exist
	// If savedDocs is undefined, we're still loading/syncing
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

	return (
		<div className="h-screen w-full overflow-y-auto">
			<Plate editor={editor} readOnly={isPreview} onChange={handleChange}>
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
