import { normalizeNodeId } from "platejs";
import type { TElement, Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import type { KeyboardEvent } from "react";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";

import { EditorThemeProvider } from "@/contexts/editor-theme-context";
import { useEditorHeaderVisibilitySafe } from "@/contexts/editor-header-visibility-context";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { useFormCustomization } from "@/hooks/use-form-customization";
import { useResolvedTheme } from "@/components/theme-provider";
import { EditorKit } from "@/components/editor/editor-kit";
import { ClientOnly } from "@/components/client-only";
import { FormSettingsSidebar } from "@/components/form-builder/form-settings-sidebar";
import { AboutSidebar } from "@/components/ui/about-sidebar";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { AppHeader } from "@/components/ui/app-header";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import type { FormHeaderElementData } from "@/components/ui/form-header-node";
import { migrateEditorContent } from "@/lib/editor/migrate-editor-content";
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
import { getLocalFormCollection } from "@/collections/local/form";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useLocalForm } from "@/hooks/use-live-hooks";
import { getLocalFormId, getLocalWorkspaceId } from "@/db/local-draft";

// Initial state — form header, a label, a form input, and a submit button
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
  createFormButtonNode("submit") as unknown as TElement,
]);

const noop = async () => {};

const LandingEditor = () => (
  <ClientOnly
    fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    }
  >
    {() => <LandingLayout />}
  </ClientOnly>
);

const LandingLayout = () => {
  const { activeSidebar, previewMode } = useEditorSidebar();
  const showSidebar = !!activeSidebar;

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
              "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
              !isRightResizing && "transition-[padding] duration-200 ease-linear",
            )}
            style={{ paddingRight: showSidebar ? rightSidebarWidth : 0 }}
          >
            {previewMode ? <LocalPreviewMode /> : <LocalEditorApp />}
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
};

const LandingSidebar = () => {
  const localFormId = getLocalFormId();
  const { activeSidebar, closeSidebar } = useEditorSidebar();

  if (activeSidebar === "about") {
    return <AboutSidebar onClose={closeSidebar} />;
  }
  if (activeSidebar === "settings") {
    return <FormSettingsSidebar formId={localFormId} isLocal />;
  }
  if (activeSidebar === "customize") {
    return <CustomizeSidebar formId={localFormId} isLocal />;
  }
  return null;
};

const LocalEditorApp = () => {
  const localFormId = getLocalFormId();
  const { data: savedDocs } = useLocalForm(localFormId);

  // Ensure localStorage record exists so both editor saves and sidebar updates always work.
  // Runs once on mount — if the record already exists the insert is skipped.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    const existing = savedDocs?.find((d) => d.id === localFormId);
    // Signal to the post-login dashboard that there's anon data worth
    // migrating — set regardless of whether we insert a fresh record or
    // the draft already exists in OPFS from a previous session. Lets
    // authenticated routes skip OPFS init entirely when no draft has
    // ever been created, keeping login → dashboard fast for first-timers.
    localStorage.setItem("bf-has-local-draft", "1");
    if (!existing) {
      try {
        getLocalFormCollection().insert({
          id: localFormId,
          workspaceId: getLocalWorkspaceId(),
          formName: "draft",
          schemaName: "draftFormSchema",
          isMultiStep: false,
          status: "draft" as const,
          content: [],
          title: "Draft Form",
          // zod schema defaults don't apply in sync-absent persisted mode,
          // so seed the fields the editor and theme reader expect.
          customization: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Record already exists (race) — safe to ignore
      }
    }
  }

  const resolvedAppTheme = useResolvedTheme();
  const { hasCustomization, themeVars } = useFormCustomization(savedDocs?.[0], resolvedAppTheme);
  const themeCtx = useMemo(() => ({ themeVars, hasCustomization }), [themeVars, hasCustomization]);

  const skipSaveRef = useRef(false);
  const headerVisibility = useEditorHeaderVisibilitySafe();

  const initialContent = useMemo(() => {
    const docData = savedDocs?.[0];
    if (!docData?.content || !Array.isArray(docData.content)) {
      return landingValue;
    }

    return migrateEditorContent(docData.content as Value, {
      title: docData.title,
      icon: docData.icon,
      cover: docData.cover,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedDocs read once on mount
  }, []);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialContent,
  });

  const handleChange = useCallback(
    ({ value }: { value: Value }) => {
      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }

      // Persist to local collection
      const headerNode =
        value.length > 0 && value[0]?.type === "formHeader"
          ? (value[0] as unknown as FormHeaderElementData)
          : null;

      getLocalFormCollection().update(localFormId, (draft) => {
        draft.content = value;
        draft.updatedAt = new Date().toISOString();
        if (headerNode) {
          if (headerNode.title !== undefined) draft.title = headerNode.title;
          if (headerNode.icon !== undefined) draft.icon = headerNode.icon ?? null;
          if (headerNode.cover !== undefined) draft.cover = headerNode.cover ?? null;
        }
      });
    },
    [localFormId],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!headerVisibility?.enabled) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key;
      const isPrintable = key.length === 1;
      const isTypingIntentKey =
        isPrintable ||
        key === "Enter" ||
        key === "Backspace" ||
        key === "Delete" ||
        key === " " ||
        key === "Spacebar";

      if (!isTypingIntentKey) return;
      headerVisibility.reportTyping();
    },
    [headerVisibility],
  );

  return (
    <EditorThemeProvider value={themeCtx}>
      <div
        className={cn(
          "min-h-full w-full overflow-x-hidden bg-background text-foreground",
          hasCustomization && "bf-themed",
          resolvedAppTheme === "dark" && "dark",
        )}
        style={hasCustomization ? themeVars : undefined}
      >
        <Plate editor={editor} readOnly={false} onChange={handleChange}>
          <EditorContainer
            variant="default"
            className="px-0 sm:px-0 max-w-full border-none shadow-none overflow-y-visible"
          >
            <Editor variant="demo" className="rounded-none" onKeyDown={handleEditorKeyDown} />
          </EditorContainer>
        </Plate>
      </div>
    </EditorThemeProvider>
  );
};

const LocalPreviewMode = () => {
  const localFormId = getLocalFormId();
  const { data: savedDocs } = useLocalForm(localFormId);
  const resolvedAppTheme = useResolvedTheme();

  const doc = savedDocs?.[0];
  const { customization, hasCustomization, themeVars } = useFormCustomization(
    doc,
    resolvedAppTheme,
  );
  const content = (doc?.content as Value) || [];

  if (savedDocs === undefined) return <Loader />;

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background transition-colors duration-300",
        hasCustomization && "bf-themed",
        resolvedAppTheme === "dark" && "dark",
      )}
      style={hasCustomization ? themeVars : undefined}
    >
      <div className="flex-1 w-full">
        <FormPreviewFromPlate
          content={content}
          title={doc?.title ?? ""}
          icon={doc?.icon ?? undefined}
          cover={doc?.cover ?? undefined}
          onSubmit={noop}
          layout="editor"
          formId={localFormId}
          customization={customization}
        />
      </div>
    </div>
  );
};

export default LandingEditor;
