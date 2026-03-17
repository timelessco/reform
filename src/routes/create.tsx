import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { guestMiddleware } from "@/middleware/auth";

// ---- Everything below is code-split by autoCodeSplitting ----

import { normalizeNodeId } from "platejs";
import type { TElement, Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { AppHeader } from "@/components/ui/app-header";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { createOnboardingContentNode } from "@/components/ui/onboarding-content-node";
import { localFormCollection } from "@/db-collections/form.collections";
import { useLocalForm } from "@/hooks/use-live-hooks";
import { getLocalFormId, getLocalWorkspaceId } from "@/lib/local-draft";

const RouteComponent = () => (
  <ClientOnly
    fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    }
  >
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex-1 overflow-auto relative bg-background">
        <LocalEditorApp />
      </div>
    </div>
  </ClientOnly>
);

const LocalEditorApp = () => {
  const localFormId = getLocalFormId();
  const localWorkspaceId = getLocalWorkspaceId();
  const { data: savedDocs } = useLocalForm(localFormId);

  const initializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const skipSaveRef = useRef(false);

  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  const lastSavedContentRef = useRef<Value | null>(null);

  // Compute onboarding value lazily (was previously module-scope)
  const onboardingValue = useMemo(
    () =>
      normalizeNodeId([
        createFormHeaderNode({ title: "hello" }) as unknown as TElement,
        createOnboardingContentNode() as unknown as TElement,
        {
          children: [{ text: "" }],
          type: "p",
        },
      ]),
    [],
  );

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
  }, [savedDocs, editor, onboardingValue]);

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
        localFormCollection.update(localFormId, (draft) => {
          Object.assign(draft, updateData);
        });
      } catch {
        localFormCollection.insert({
          id: localFormId,
          workspaceId: localWorkspaceId,
          formName: "draft",
          schemaName: "draftFormSchema",
          isMultiStep: false,
          status: "draft" as const,
          createdAt: new Date().toISOString(),
          ...updateData,
        });
      }
    },
    [localFormId, localWorkspaceId],
  );

  if (!isReady) return <Loader />;

  return (
    <div className="h-full w-full overflow-y-auto">
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
};

export const Route = createFileRoute("/create")({
  server: {
    middleware: [guestMiddleware],
  },
  ssr: false,
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
