import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FileTextIcon,
  HelpCircleIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/icons";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createFormLocal, createWorkspaceLocal, updateFormStatus } from "@/collections";
import { useDuplicateForm } from "@/hooks/use-duplicate-form";
import { useOrgForms, useOrgWorkspaces } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth/auth-client";
import { formatForDisplay, HOTKEYS } from "@/lib/hotkeys";
import { clearLocalDraftIds } from "@/db/local-draft";
import { hasLocalDataToSync, syncLocalDataToCloud } from "@/db/sync";
import { parseTimestampAsUTC } from "@/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";
import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { FolderPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
const FORMS_PER_PAGE = 10;

const SYNC_MESSAGES = [
  "Syncing your local forms to the cloud",
  "Uploading form data",
  "Almost there",
];

const SyncOverlay = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % SYNC_MESSAGES.length);
    }, 2500);
    return () => clearInterval(messageInterval);
  }, []);

  const dots = ".".repeat(dotCount);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      <div className="h-6 overflow-hidden">
        <p
          key={messageIndex}
          className="text-sm text-muted-foreground animate-in slide-in-from-bottom-2 fade-in duration-300"
        >
          <span>{SYNC_MESSAGES[messageIndex]}</span>
          <span className="inline-block w-5 text-left">{dots}</span>
        </p>
      </div>
    </div>
  );
};

// Two persisted signals control the post-login draft migration:
//
//   bf-has-local-draft   : set by the landing editor whenever a draft is
//                          created or already exists in OPFS. Cleared by
//                          a successful sync or on logout.
//   bf-last-synced-user  : userId of the last account the local drafts
//                          were migrated into. Prevents re-sync on hard
//                          reload and when navigating back to /dashboard
//                          after SPA navigation. Reset on logout so a
//                          subsequent signup-with-draft flow still runs.
//
// Both live in localStorage (not sessionStorage) so the magic-link
// callback — which is a full page navigation through /api/auth/... —
// preserves them across the redirect.
const HAS_LOCAL_DRAFT_KEY = "bf-has-local-draft";
const LAST_SYNCED_USER_KEY = "bf-last-synced-user";

const DashboardPage = () => {
  const navigate = useNavigate();
  const duplicateFormFn = useDuplicateForm();
  const { activeOrg } = useLoaderData({ from: "/_authenticated" });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [duplicatingFormId, setDuplicatingFormId] = useState<string | null>(null);

  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: liveWorkspaces, isLoading: wsLoading } = useOrgWorkspaces(activeOrg?.id);
  const { data: liveForms, isLoading: formsLoading } = useOrgForms(activeOrg?.id);

  const isLoading = wsLoading || formsLoading;
  const isDataReady = !isLoading && liveWorkspaces !== undefined && liveForms !== undefined;

  const orgWorkspaces = useMemo(
    () => (isDataReady ? liveWorkspaces || [] : []),
    [isDataReady, liveWorkspaces],
  );

  const orgForms = useMemo(() => (isDataReady ? liveForms || [] : []), [isDataReady, liveForms]);

  const workspaceNameMap = useMemo(
    () => new Map(orgWorkspaces.map((ws) => [ws.id, ws.name])),
    [orgWorkspaces],
  );

  const totalPages = Math.ceil(orgForms.length / FORMS_PER_PAGE);
  const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
  const paginatedForms = orgForms.slice(startIndex, startIndex + FORMS_PER_PAGE);

  useEffect(() => {
    const syncData = async () => {
      const userId = session?.user?.id;
      if (!userId || !activeOrg?.id) return;

      // Persisted "already migrated" check — survives reloads and tab
      // navigation so a hard refresh on /dashboard never re-runs sync.
      if (localStorage.getItem(LAST_SYNCED_USER_KEY) === userId) return;

      // Fast path: no draft has ever been created in this browser, skip
      // OPFS init entirely.
      if (localStorage.getItem(HAS_LOCAL_DRAFT_KEY) !== "1") {
        localStorage.setItem(LAST_SYNCED_USER_KEY, userId);
        return;
      }

      // Lazy-init the local collection: this is the first authenticated
      // touchpoint, and the landing route's bootstrap didn't mount on the
      // post-auth redirect.
      const { initLocalFormCollection } = await import("@/collections/local/form");
      const { getPersistence } = await import("@/collections/_persistence");
      const bundle = await getPersistence();
      await initLocalFormCollection(bundle?.persistence ?? null);

      const hasData = await hasLocalDataToSync();
      if (!hasData) {
        // OPFS had nothing; clear the stale signal.
        localStorage.removeItem(HAS_LOCAL_DRAFT_KEY);
        localStorage.setItem(LAST_SYNCED_USER_KEY, userId);
        return;
      }

      setIsSyncing(true);
      try {
        const result = await syncLocalDataToCloud(activeOrg.id);
        if (result?.syncedForms && result.syncedForms.length > 0) {
          clearLocalDraftIds();
          localStorage.removeItem(HAS_LOCAL_DRAFT_KEY);
          toast.success("Local data synced!");
        }
        localStorage.setItem(LAST_SYNCED_USER_KEY, userId);
      } catch (error) {
        console.error("[dashboard] Failed to sync local data:", error);
        toast.error("Signed in but failed to sync local data");
      } finally {
        setIsSyncing(false);
      }
    };
    syncData();
  }, [session?.user?.id, activeOrg?.id]);

  const handleCreateWorkspace = useCallback(async () => {
    if (!activeOrg?.id) return;
    try {
      await createWorkspaceLocal(activeOrg.id, "New Collection");
      toast.success("Workspace created");
    } catch (error) {
      console.error("Failed to create workspace:", error);
      toast.error("Failed to create workspace");
    }
  }, [activeOrg?.id]);

  const handleCreateForm = useCallback(async () => {
    if (orgWorkspaces.length === 0) return;

    setIsCreating(true);
    try {
      const defaultWorkspace = orgWorkspaces[0];
      const { form: newForm } = createFormLocal(defaultWorkspace.id);
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: defaultWorkspace.id, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to create form:", error);
    } finally {
      setIsCreating(false);
    }
  }, [orgWorkspaces, navigate]);

  const handleDeleteClick = useCallback((form: { id: string; title: string }) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (formToDelete) {
      try {
        await updateFormStatus(formToDelete.id, "archived");
        setDeleteDialogOpen(false);
        setFormToDelete(null);
      } catch (error) {
        console.error("Failed to archive form:", error);
      }
    }
  }, [formToDelete]);

  const handleDuplicate = useCallback(
    async (formId: string) => {
      setDuplicatingFormId(formId);
      try {
        await duplicateFormFn(formId);
      } catch {
        toast.error("Failed to duplicate form");
      } finally {
        setDuplicatingFormId(null);
      }
    },
    [duplicateFormFn],
  );

  const handlePrevPage = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);

  const handleNextPage = useCallback(
    () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    [totalPages],
  );

  const formatLastEdited = (timestamp: string) =>
    `Edited ${formatDistanceToNow(parseTimestampAsUTC(timestamp) ?? new Date())} ago`;

  const hasSelection = selectedFormIds.size > 0;

  const handleToggleSelect = useCallback((formId: string) => {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFormIds.size === paginatedForms.length) {
      setSelectedFormIds(new Set());
    } else {
      setSelectedFormIds(new Set(paginatedForms.map((f) => f.id)));
    }
  }, [selectedFormIds.size, paginatedForms]);

  const handleClearSelection = useCallback(() => {
    setSelectedFormIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedFormIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  }, [selectedFormIds.size]);

  const handleConfirmBulkDelete = useCallback(async () => {
    const count = selectedFormIds.size;
    try {
      const promises = [...selectedFormIds].map((id) => updateFormStatus(id, "archived"));
      await Promise.all(promises);
      setSelectedFormIds(new Set());
      setBulkDeleteDialogOpen(false);
      toast.success(`${count} form${count !== 1 ? "s" : ""} deleted`);
    } catch {
      toast.error("Failed to delete some forms");
    }
  }, [selectedFormIds]);

  useEffect(() => {
    setSelectedFormIds(new Set());
  }, [currentPage]);

  useHotkey(HOTKEYS.DASHBOARD_SELECT_ALL, handleSelectAll, {
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  useHotkey(HOTKEYS.DASHBOARD_DELETE, handleBulkDelete, {
    enabled: hasSelection,
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  useHotkey(HOTKEYS.DASHBOARD_CLEAR_SELECTION, handleClearSelection, {
    enabled: hasSelection,
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 p-6 md:p-12 lg:p-20 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Home</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading
                ? "Loading..."
                : `${orgForms.length} form${orgForms.length !== 1 ? "s" : ""} across ${orgWorkspaces.length} workspace${orgWorkspaces.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="ml-1"
              size="sm"
              variant="secondary"
              prefix={<FolderPlus className="size-4" />}
              onClick={handleCreateWorkspace}
              disabled={isLoading}
            >
              New workspace
            </Button>
            <Button
              size="sm"
              prefix={
                isCreating ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )
              }
              onClick={handleCreateForm}
              disabled={isLoading || isCreating || orgWorkspaces.length === 0}
            >
              New form
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            {isSyncing ? (
              <SyncOverlay />
            ) : isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex flex-col p-2 -mx-2 rounded-xl animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="h-5 w-48 rounded bg-muted" />
                        <div className="h-3 w-32 rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              paginatedForms.map((form) => {
                const isSelected = selectedFormIds.has(form.id);
                return (
                  <Card
                    key={form.id}
                    className={`group py-2 px-3 gap-0 ring-0 transition-[background-color,box-shadow] duration-200 cursor-pointer hover:bg-muted/30 ${isSelected ? "bg-muted/50" : ""}`}
                  >
                    <Link
                      to={
                        form.status === "published"
                          ? "/workspace/$workspaceId/form-builder/$formId/submissions"
                          : "/workspace/$workspaceId/form-builder/$formId/edit"
                      }
                      params={{
                        workspaceId: form.workspaceId,
                        formId: form.id,
                      }}
                      preload="intent"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold transition-colors">
                                {form.title || "Untitled"}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] h-4 px-1.5 font-normal ${
                                  form.status === "published"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-muted/80 text-muted-foreground"
                                } rounded-full`}
                              >
                                {form.status === "published" ? "Published" : "Draft"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span>
                                {workspaceNameMap.get(form.workspaceId) || "Unknown workspace"}
                              </span>
                              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30"></span>
                              <span>{formatLastEdited(form.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-1 transition-opacity ${duplicatingFormId === form.id || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Duplicate form"
                                    disabled={duplicatingFormId === form.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDuplicate(form.id);
                                    }}
                                  />
                                }
                              >
                                {duplicatingFormId === form.id ? (
                                  <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <CopyIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>Duplicate</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete form"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteClick({
                                        id: form.id,
                                        title: form.title || "Untitled",
                                      });
                                    }}
                                  />
                                }
                              >
                                <Trash2Icon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={isSelected ? "Deselect form" : "Select form"}
                                    className={
                                      isSelected
                                        ? "bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30 border border-muted-foreground/30"
                                        : "text-muted-foreground"
                                    }
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleToggleSelect(form.id);
                                    }}
                                  />
                                }
                              >
                                <CheckIcon className="size-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>{isSelected ? "Deselect" : "Select"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </Link>
                  </Card>
                );
              })
            )}
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + FORMS_PER_PAGE, orgForms.length)} of{" "}
                {orgForms.length} forms
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!isLoading && orgForms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/20">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileTextIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p>No forms yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create your first form to get started.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleCreateForm}
                disabled={isLoading || isCreating || orgWorkspaces.length === 0}
              >
                {isCreating && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
                Create my first form
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bulk Action Bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(560px,90vw)] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-between px-4 py-3 bg-background rounded-2xl border border-border/40 shadow-card-elevated">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-6 w-6 rounded-md bg-foreground text-background">
                <CheckIcon className="h-4 w-4" strokeWidth={3} />
              </div>
              <span className="text-sm font-medium">{selectedFormIds.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBulkDelete}>
                Delete
                <span className="text-xs text-muted-foreground ml-1">
                  {formatForDisplay(HOTKEYS.DASHBOARD_DELETE)}
                </span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="border border-border/50"
                onClick={handleClearSelection}
              >
                <XIcon className="h-3.5 w-3.5" />
                Clear
                <span className="text-xs text-muted-foreground ml-1">
                  {formatForDisplay(HOTKEYS.DASHBOARD_CLEAR_SELECTION)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {!hasSelection && (
        <div className="fixed bottom-6 right-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-muted/50 hover:bg-secondary shadow-sm border"
            aria-label="Help"
          >
            <HelpCircleIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      )}

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedFormIds.size} form
              {selectedFormIds.size !== 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedFormIds.size} form
              {selectedFormIds.size !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  ssr: "data-only",
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
