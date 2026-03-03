import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { EditorKit } from "@/components/editor/editor-kit";
import { ClientOnly } from "@/components/client-only";
import { FormSettingsSidebar } from "@/components/form-builder/form-settings-sidebar";
import { AboutSidebar } from "@/components/ui/about-sidebar";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import Loader from "@/components/ui/loader";
import {
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { localFormCollection } from "@/db-collections";
import {
  EditorSidebarProvider,
  useEditorSidebar,
} from "@/hooks/use-editor-sidebar";
import { useLocalForm } from "@/hooks/use-live-hooks";
import { getLocalFormId, getLocalWorkspaceId } from "@/lib/local-draft";

// Initial state — form header, a label, and a form input
const landingValue = normalizeNodeId([
  createFormHeaderNode({ title: "" }) as unknown as TElement,
  {
    type: "formLabel",
    required: false,
    placeholder: "Start designing",
    children: [{ text: "" }],
  },
  {
    type: "formInput",
    placeholder: "Your form",
    children: [{ text: "" }],
  },
]);

export default function LandingEditor() {
  return (
    <ClientOnly
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader />
        </div>
      }
    >
      {() => (
        <EditorSidebarProvider>
          <LandingLayout />
        </EditorSidebarProvider>
      )}
    </ClientOnly>
  );
}

function LandingLayout() {
  const { activeSidebar } = useEditorSidebar();
  const showSidebar = !!activeSidebar;
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    if (rightPanelRef.current) {
      if (showSidebar) {
        rightPanelRef.current.expand();
      } else {
        rightPanelRef.current.collapse();
      }
    }
  }, [showSidebar]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="flex-1 [&>[data-panel]]:transition-[flex-grow] [&>[data-panel]]:duration-300 [&>[data-panel]]:ease-in-out">
        <ResizablePanel
          defaultSize={showSidebar ? "70%" : "100%"}
          minSize="50%"
          className="flex-1"
        >
          <div className="flex h-full min-w-0 flex-col">
            <div className="relative z-0 shrink-0">
              <AppHeader />
            </div>
            <div className="flex-1 min-h-0">
              <LocalEditorApp />
            </div>
          </div>
        </ResizablePanel>

        <ResizablePanel
          panelRef={rightPanelRef}
          collapsible
          collapsedSize="0%"
          defaultSize={showSidebar ? "30%" : "0%"}
          minSize="25%"
          maxSize="50%"
          className={cn(
            "h-full overflow-hidden bg-background min-w-[280px] max-w-[420px]",
            !showSidebar && "border-none min-w-0 max-w-none",
          )}
        >
          <div className="h-full w-full">
            <Suspense fallback={null}>
              <SidebarProvider>
                <LandingSidebar />
              </SidebarProvider>
            </Suspense>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function LandingSidebar() {
  const localFormId = getLocalFormId();
  const { activeSidebar, closeSidebar } = useEditorSidebar();

  if (activeSidebar === "about") {
    return <AboutSidebar onClose={() => closeSidebar()} />;
  }
  if (activeSidebar === "settings") {
    return <FormSettingsSidebar formId={localFormId} />;
  }
  if (activeSidebar === "customize") {
    return <CustomizeSidebar formId={localFormId} />;
  }
  return null;
}

function LocalEditorApp() {
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

  useEffect(() => {
    if (initializedRef.current) return;
    if (savedDocs === undefined) return;

    initializedRef.current = true;

    const docData = savedDocs?.[0];
    let initialContent: Value;

    if (docData?.content && Array.isArray(docData.content)) {
      initialContent = docData.content as Value;
    } else {
      initialContent = landingValue;
    }

    lastSavedContentRef.current = initialContent;
    skipSaveRef.current = true;

    editor.tf.init({
      value: initialContent,
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
    <main className="flex-1 overflow-y-auto bg-background">
      <Plate editor={editor} readOnly={false} onChange={handleChange}>
        <EditorContainer
          variant="default"
          className="px-0 sm:px-0 max-w-full mx-auto border-none shadow-none"
        >
          <Editor className="overflow-x-visible" />
        </EditorContainer>
      </Plate>
    </main>
  );
}
