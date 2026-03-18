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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  createFormLocal,
  duplicateFormById,
  updateFormStatus,
} from "@/db-collections/form.collections";
import { createWorkspaceLocal } from "@/db-collections/workspace.collection";
import { useOrgForms, useOrgWorkspaces } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { clearLocalDraftIds } from "@/lib/local-draft";
import { syncLocalDataToCloud } from "@/lib/sync";
import { parseTimestampAsUTC } from "@/lib/utils";
import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FileTextIcon,
  HelpCircleIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { FolderPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const FORMS_PER_PAGE = 10;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { activeOrg } = useLoaderData({ from: "/_authenticated" });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: session } = useSession();

  const { data: liveWorkspaces, isLoading: wsLoading } = useOrgWorkspaces(activeOrg?.id);
  const { data: liveForms, isLoading: formsLoading } = useOrgForms(activeOrg?.id);

  const isLoading = wsLoading || formsLoading;
  const isElectricReady = !isLoading && liveWorkspaces !== undefined && liveForms !== undefined;

  const orgWorkspaces = useMemo(
    () => (isElectricReady ? liveWorkspaces || [] : []),
    [isElectricReady, liveWorkspaces],
  );

  const orgForms = useMemo(
    () => (isElectricReady ? liveForms || [] : []),
    [isElectricReady, liveForms],
  );

  const workspaceNameMap = useMemo(
    () => new Map(orgWorkspaces.map((ws) => [ws.id, ws.name])),
    [orgWorkspaces],
  );

  const totalPages = Math.ceil(orgForms.length / FORMS_PER_PAGE);
  const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
  const paginatedForms = orgForms.slice(startIndex, startIndex + FORMS_PER_PAGE);

  useEffect(() => {
    const syncData = async () => {
      const shouldSyncSocial = sessionStorage.getItem("shouldSyncAfterSocialLogin") === "true";
      const shouldSyncLogin = sessionStorage.getItem("shouldSyncAfterLogin") === "true";
      const shouldSync = shouldSyncSocial || shouldSyncLogin;

      if (!shouldSync || !session?.user || !activeOrg?.id) return;

      if (shouldSyncSocial) sessionStorage.removeItem("shouldSyncAfterSocialLogin");
      if (shouldSyncLogin) sessionStorage.removeItem("shouldSyncAfterLogin");

      try {
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
      const newForm = await createFormLocal(defaultWorkspace.id);
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
      try {
        const newForm = await duplicateFormById(formId);
        toast.success("Form duplicated");
        navigate({
          to: "/workspace/$workspaceId/form-builder/$formId/edit",
          params: { workspaceId: newForm.workspaceId, formId: newForm.id },
        });
      } catch (error) {
        console.error("Failed to duplicate form:", error);
        toast.error("Failed to duplicate form");
      }
    },
    [navigate],
  );

  const handlePrevPage = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);

  const handleNextPage = useCallback(
    () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    [totalPages],
  );

  const formatLastEdited = (timestamp: string) =>
    `Edited ${formatDistanceToNow(parseTimestampAsUTC(timestamp) ?? new Date())} ago`;

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
                    className="group flex flex-col p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-[background-color] duration-200 cursor-pointer"
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
                              <span className="font-semibold  transition-colors">
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

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Duplicate form"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDuplicate(form.id);
                                    }}
                                  />
                                }
                              >
                                <CopyIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Duplicate</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
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
                          </TooltipProvider>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
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
  ssr: false,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
