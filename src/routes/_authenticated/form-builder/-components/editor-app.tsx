import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { Button } from "@/components/ui/button";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { editorDocCollection } from "@/db-collections";
import { updateDoc } from "@/services/form.service";

interface EditorAppProps {
	formId: string;
}

const defaultValue = normalizeNodeId([
	createFormHeaderNode() as unknown as TElement,
	{
		children: [{ text: "Start building your form..." }],
		type: "p",
	},
]);

export default function EditorApp({ formId }: EditorAppProps) {
	const { data: savedDocs } = useLiveQuery((q) =>
		q.from({ doc: editorDocCollection }).where(({ doc }) => eq(doc.id, formId)),
	);

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
		let initialContent: Value | undefined;

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

			updateDoc(formId, (draft: any) => {
				draft.content = value;
			});
		},
		[formId],
	);

	const isPreview = savedDocs?.[0]?.isPreview ?? false;

	if (!isReady) {
		return (
			<div className="h-screen w-full flex items-center justify-center">
				Loading editor...
			</div>
		);
	}

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
