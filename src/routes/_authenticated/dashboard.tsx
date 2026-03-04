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
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createFormLocal,
  createWorkspaceLocal,
  duplicateFormById,
  updateFormStatus,
} from "@/db-collections";
import { useForms, useWorkspaces } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { clearLocalDraftIds } from "@/lib/local-draft";
import { syncLocalDataToCloud } from "@/lib/sync";
import { parseTimestampAsUTC } from "@/lib/utils";
import {
  createFileRoute,
  Link,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FolderPlus,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const FORMS_PER_PAGE = 10;

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  ssr: "data-only",
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { activeOrg } = useLoaderData({ from: "/_authenticated" });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Get current session/user
  const { data: session } = useSession();

  // Live queries for real-time sync - single source of truth
  const { data: liveWorkspaces, isLoading: wsLoading } = useWorkspaces();
  const { data: liveForms, isLoading: formsLoading } = useForms();

  // Determine if Electric has synced
  const isLoading = wsLoading || formsLoading;
  const isElectricReady =
    !isLoading && liveWorkspaces !== undefined && liveForms !== undefined;

  // Use live data directly once Electric is ready (like sidebar does)
  const orgWorkspaces = useMemo(() => {
    if (!activeOrg?.id || !isElectricReady) return [];
    return (liveWorkspaces || []).filter(
      (ws) => ws.organizationId === activeOrg.id,
    );
  }, [liveWorkspaces, activeOrg?.id, isElectricReady]);

  const orgForms = useMemo(() => {
    if (!isElectricReady) return [];
    return (liveForms || [])
      .filter((form) => orgWorkspaces.some((ws) => ws.id === form.workspaceId))
      .filter((form) => form.status !== "archived")
      .toSorted(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [liveForms, orgWorkspaces, isElectricReady]);

  // Create workspace name lookup
  const workspaceNameMap = new Map(orgWorkspaces.map((ws) => [ws.id, ws.name]));

  // Pagination
  const totalPages = Math.ceil(orgForms.length / FORMS_PER_PAGE);
  const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
  const paginatedForms = orgForms.slice(
    startIndex,
    startIndex + FORMS_PER_PAGE,
  );

  // Handle sync after login/signup redirect
  useEffect(() => {
    const syncData = async () => {
      const shouldSync =
        sessionStorage.getItem("shouldSyncAfterSocialLogin") === "true" ||
        sessionStorage.getItem("shouldSyncAfterLogin") === "true";

      if (!shouldSync || !session?.user || !activeOrg?.id) return;

      // Clear flags immediately to prevent multiple syncs
      sessionStorage.removeItem("shouldSyncAfterSocialLogin");
      sessionStorage.removeItem("shouldSyncAfterLogin");

      try {
        // Sync via Electric collections
        // Shapes now have proper auth context because startSync: false
        // means sync only starts after _authenticated loader calls preload()
        const result = await syncLocalDataToCloud(activeOrg.id);
        if (result?.syncedForms && result.syncedForms.length > 0) {
          clearLocalDraftIds();
          toast.success("Local data synced!");
        }
      } catch (error) {
        console.error("Failed to sync local data:", error);
        toast.error("Signed in but failed to sync local data");
      }
    };
    syncData();
  }, [session, activeOrg?.id]);

  const handleCreateWorkspace = async () => {
    if (!activeOrg?.id) return;
    try {
      await createWorkspaceLocal(activeOrg.id, "New Collection");
      toast.success("Workspace created");
      // Live queries will pick up the new workspace
    } catch (error) {
      console.error("Failed to create workspace:", error);
      toast.error("Failed to create workspace");
    }
  };

  const handleCreateForm = async () => {
    if (orgWorkspaces.length === 0) return;

    setIsCreating(true);
    try {
      const defaultWorkspace = orgWorkspaces[0];
      const newForm = await createFormLocal(defaultWorkspace.id);
      // Live queries will automatically pick up the new form
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: defaultWorkspace.id, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to create form:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (form: { id: string; title: string }) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (formToDelete) {
      try {
        await updateFormStatus(formToDelete.id, "archived");
        // Live queries will automatically pick up the archived form
        setDeleteDialogOpen(false);
        setFormToDelete(null);
      } catch (error) {
        console.error("Failed to archive form:", error);
      }
    }
  };

  const handleDuplicate = async (formId: string) => {
    try {
      const newForm = await duplicateFormById(formId);
      toast.success("Form duplicated");
      // Navigate to the duplicated form
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: newForm.workspaceId, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to duplicate form:", error);
      toast.error("Failed to duplicate form");
    }
  };

  const formatLastEdited = (timestamp: string) => {
    return `Edited ${formatDistanceToNow(parseTimestampAsUTC(timestamp) ?? new Date())} ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 lg:p-20 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Home</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {isLoading
                ? "Loading..."
                : `${orgForms.length} form${orgForms.length !== 1 ? "s" : ""} across ${orgWorkspaces.length} workspace${orgWorkspaces.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
              onClick={handleCreateWorkspace}
              disabled={isLoading}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New workspace
            </Button>
            <Button
              size="sm"
              onClick={handleCreateForm}
              disabled={isLoading || isCreating || orgWorkspaces.length === 0}
              className=" font-medium"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New form
            </Button>
          </div>
        </div>

        {/* Forms List */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {isLoading
              ? [1, 2, 3, 4, 5].map((i) => (
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
              : paginatedForms.map((form) => (
                  <div
                    key={form.id}
                    className="group flex flex-col p-2 -mx-2 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer"
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
                      preloadDelay={1000}
                      preload="intent"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
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
                                {form.status === "published"
                                  ? "Published"
                                  : "Draft"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-medium">
                              <span>
                                {workspaceNameMap.get(form.workspaceId) ||
                                  "Unknown workspace"}
                              </span>
                              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30"></span>
                              <span>{formatLastEdited(form.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-muted"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDuplicate(form.id);
                                    }}
                                  />
                                }
                              >
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Duplicate</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-
                {Math.min(startIndex + FORMS_PER_PAGE, orgForms.length)} of{" "}
                {orgForms.length} forms
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!isLoading && orgForms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/20">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No forms yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create your first form to get started.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleCreateForm}
                disabled={isLoading || isCreating || orgWorkspaces.length === 0}
              >
                {isCreating && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Create my first form
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Help Circle */}
      <div className="fixed bottom-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted shadow-sm border"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.title}"? This
              action cannot be undone.
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
}
