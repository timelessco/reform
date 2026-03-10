import { normalizeNodeId } from "platejs";
import type { TElement, Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { EditorThemeProvider } from "@/contexts/editor-theme-context";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { useFormCustomization } from "@/hooks/use-form-customization";
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
  RIGHT_SIDEBAR_WIDTH_DEFAULT,
  RIGHT_SIDEBAR_WIDTH_KEY,
  RIGHT_SIDEBAR_WIDTH_MAX,
  RIGHT_SIDEBAR_WIDTH_MIN,
  RightSidebarResizeHandle,
} from "@/components/ui/right-sidebar-resize-handle";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { localFormCollection } from "@/db-collections/form.collections";
import { EditorSidebarProvider, useEditorSidebar } from "@/hooks/use-editor-sidebar";
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
  const { demo } = useSearch({ strict: false }) as { demo?: boolean };

  // Right sidebar width state (persisted, matches authenticated route)
  const [rightSidebarWidth, _setRightSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return RIGHT_SIDEBAR_WIDTH_DEFAULT;
    const stored = localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (
        !Number.isNaN(parsed) &&
        parsed >= RIGHT_SIDEBAR_WIDTH_MIN &&
        parsed <= RIGHT_SIDEBAR_WIDTH_MAX
      ) {
        return parsed;
      }
    }
    return RIGHT_SIDEBAR_WIDTH_DEFAULT;
  });
  const [isRightResizing, setIsRightResizing] = useState(false);

  const setRightSidebarWidth = useCallback((width: number) => {
    const clamped = Math.round(
      Math.min(RIGHT_SIDEBAR_WIDTH_MAX, Math.max(RIGHT_SIDEBAR_WIDTH_MIN, width)),
    );
    _setRightSidebarWidth(clamped);
    localStorage.setItem(RIGHT_SIDEBAR_WIDTH_KEY, String(clamped));
  }, []);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      data-resizing={isRightResizing ? "" : undefined}
    >
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Main content - flex-1 auto fills available space */}
        <div className={cn("flex-1 min-w-0 flex flex-col")}>
          <div className="relative z-0 shrink-0">
            <AppHeader />
          </div>
          <div
            className={cn(
              "flex-1 min-h-0",
              !isRightResizing && "transition-[padding] duration-200 ease-linear",
            )}
            style={{ paddingRight: showSidebar ? rightSidebarWidth : 0 }}
          >
            {demo ? <LocalPreviewMode /> : <LocalEditorApp />}
          </div>
        </div>
      </div>

      {/* Right sidebar resize handle - fixed overlay */}
      {showSidebar && (
        <RightSidebarResizeHandle
          sidebarWidth={rightSidebarWidth}
          setSidebarWidth={setRightSidebarWidth}
          setIsResizing={setIsRightResizing}
        />
      )}

      {/* Right sidebar - fixed overlay */}
      <div
        className={cn(
          "fixed top-0 bottom-0 right-0 z-40 overflow-hidden bg-background",
          !isRightResizing && "transition-[width] duration-200 ease-linear",
          "[[data-resizing]_&]:transition-none",
          showSidebar && "border-l border-border/60",
          !showSidebar && "pointer-events-none",
        )}
        style={{
          width: showSidebar ? `${rightSidebarWidth}px` : 0,
        }}
      >
        <div className="h-full w-full">
          <Suspense fallback={null}>
            <SidebarProvider className="min-h-0 h-full">
              <LandingSidebar />
            </SidebarProvider>
          </Suspense>
        </div>
      </div>
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
    return <FormSettingsSidebar formId={localFormId} isLocal />;
  }
  if (activeSidebar === "customize") {
    return <CustomizeSidebar formId={localFormId} isLocal />;
  }
  return null;
}

function LocalEditorApp() {
  const localFormId = getLocalFormId();
  const localWorkspaceId = getLocalWorkspaceId();
  const { data: savedDocs } = useLocalForm(localFormId);

  const { customization, hasCustomization, themeVars } = useFormCustomization(savedDocs?.[0]);
  const themeCtx = useMemo(() => ({ themeVars, hasCustomization }), [themeVars, hasCustomization]);

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
    <EditorThemeProvider value={themeCtx}>
      <main
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden bg-background text-foreground",
          hasCustomization && "bf-themed",
          customization?.mode === "dark" && "dark",
        )}
        style={hasCustomization ? themeVars : undefined}
      >
        <Plate editor={editor} readOnly={false} onChange={handleChange}>
          <EditorContainer
            variant="default"
            className="px-0 sm:px-0 max-w-full mx-auto border-none shadow-none"
          >
            <Editor variant="demo" />
          </EditorContainer>
        </Plate>
      </main>
    </EditorThemeProvider>
  );
}

function LocalPreviewMode() {
  const localFormId = getLocalFormId();
  const { data: savedDocs } = useLocalForm(localFormId);

  const doc = savedDocs?.[0];
  const { customization, hasCustomization, themeVars } = useFormCustomization(doc);
  const content = (doc?.content as Value) || [];

  if (savedDocs === undefined) return <Loader />;

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background transition-colors duration-300",
        hasCustomization && "bf-themed",
        customization?.mode === "dark" && "dark",
      )}
      style={hasCustomization ? themeVars : undefined}
    >
      <div className="flex-1 w-full">
        <FormPreviewFromPlate
          content={content}
          title={doc?.title ?? ""}
          icon={doc?.icon ?? undefined}
          cover={doc?.cover ?? undefined}
          onSubmit={async () => {}}
          layout="editor"
          formId={localFormId}
        />
      </div>
    </div>
  );
}
