import { Link } from "@tanstack/react-router";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { Button } from "@/components/ui/button";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import type { FormHeaderElementData } from "@/components/ui/form-header-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { updateDoc, updateHeader } from "@/db-collections";
import { useForm } from "@/hooks/use-live-hooks";

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

export default function EditorApp({
	formId,
	workspaceId,
	defaultValue,
}: EditorAppProps) {
	const { data: savedDocs } = useForm(formId);
	const initializedRef = useRef(false);
	const [isReady, setIsReady] = useState(false);
	const skipSaveRef = useRef(false);
	const lastKnownContentRef = useRef<string | null>(null);

	const editor = usePlateEditor({
		plugins: EditorKit,
	});

	const lastSavedContentRef = useRef<Value | null>(null);
	useEffect(() => {
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/bc04ab0d-75d0-4ec8-b742-bb373a0ca5a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'editor-app.tsx:useEffect:entry',message:'useEffect triggered',data:{formId,savedDocsUndefined:savedDocs===undefined,savedDocsLength:savedDocs?.length,savedDocsFirstId:savedDocs?.[0]?.id,savedDocsFirstTitle:savedDocs?.[0]?.title,initializedRef:initializedRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
		// #endregion
		if (savedDocs === undefined) return;
		if (savedDocs.length === 0) return; // Wait for form data to be available

		const docData = savedDocs?.[0];
		const incomingContentStr = JSON.stringify(docData?.content);

		// First-time initialization
		if (!initializedRef.current) {
			initializedRef.current = true;
			lastKnownContentRef.current = incomingContentStr;

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
						node.type === "formButton" && node.buttonRole === "submit",
				);
				if (!hasSubmitButton) {
					// Find the position to insert Submit (before thank-you pageBreak if exists, otherwise at end)
					const thankYouIndex = initialContent.findIndex(
						(node: TElement) =>
							node.type === "pageBreak" && node.isThankYouPage === true,
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
			return;
		}

		if (lastKnownContentRef.current !== incomingContentStr) {
			lastKnownContentRef.current = incomingContentStr;
			lastSavedContentRef.current = docData.content as Value;
			skipSaveRef.current = true;
			editor.tf.init({
				value: docData.content as Value,
				autoSelect: "end",
			});
		}
	}, [savedDocs, editor, defaultValue, formId]);

	const handleChange = useCallback(
		({ value }: { value: Value }) => {
			if (skipSaveRef.current) {
				skipSaveRef.current = false;
				return;
			}

			const contentStr = JSON.stringify(value);
			const lastSavedStr = JSON.stringify(lastSavedContentRef.current);
			if (contentStr === lastSavedStr) return;

			lastSavedContentRef.current = value;
			lastKnownContentRef.current = contentStr;
			const now = new Date().toISOString();

			updateDoc(formId, (draft) => {
				draft.workspaceId = workspaceId;
				draft.createdAt = now;
				draft.updatedAt = now;
				draft.content = value;
			});

			if (value.length > 0 && value[0]?.type === "formHeader") {
				const headerNode = value[0] as FormHeaderElementData;
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
