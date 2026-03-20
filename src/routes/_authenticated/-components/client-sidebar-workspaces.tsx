import { ThemedFormIcon } from "@/components/icon-picker/icon-picker-preview";
import { SidebarItem } from "@/components/sidebar-item";
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
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarSection } from "@/components/ui/sidebar-section";
import type { WorkspaceWithForms } from "@/components/workspace-item-minimal";
import { WorkspaceItemMinimal } from "@/components/workspace-item-minimal";
import { duplicateFormById, updateFormStatus } from "@/db-collections/form.collections";
import { deleteWorkspaceLocal, updateWorkspaceName } from "@/db-collections/workspace.collection";
import {
  useFavoriteForms,
  useOrgForms,
  useOrgWorkspaces,
  useSubmissionCounts,
} from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

const WorkspacesSkeleton = () => (
  <div className="flex flex-col">
    <div className="mt-[15px] space-y-4">
      {["skeleton-1", "skeleton-2", "skeleton-3"].map((key) => (
        <div key={key} className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const SidebarWorkspacesContent = ({ activeOrgId }: { activeOrgId?: string }) => {
  const router = useRouter();
  const location = useLocation();
  const { data: session } = useSession();

  // Sort mode state with localStorage persistence
  const [sortMode, setSortMode] = useState<"recent" | "oldest" | "alphabetical" | "manual">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("sidebar-sort-mode") as
          | "recent"
          | "oldest"
          | "alphabetical"
          | "manual") || "recent"
      );
    }
    return "recent";
  });
  const handleSortChange = useCallback((mode: "recent" | "oldest" | "alphabetical" | "manual") => {
    setSortMode(mode);
    localStorage.setItem("sidebar-sort-mode", mode);
  }, []);

  const { data: workspacesData, isLoading: workspacesLoading } = useOrgWorkspaces(activeOrgId);
  const { data: formsData, isLoading: formsLoading } = useOrgForms(activeOrgId);
  const submissionCounts = useSubmissionCounts();

  // Get user's favorite forms
  const favoriteForms = useFavoriteForms(session?.user?.id);

  // Determine if Electric has synced
  const isLoading = workspacesLoading || formsLoading;
  const isElectricReady = !isLoading && workspacesData !== undefined && formsData !== undefined;

  // Combine workspaces with their forms, filtered by active organization
  const workspaces: WorkspaceWithForms[] = useMemo(() => {
    if (!activeOrgId || !isElectricReady) return [];

    const formsByWorkspace = (formsData || []).reduce(
      (acc, form) => {
        if (!acc[form.workspaceId]) acc[form.workspaceId] = [];
        acc[form.workspaceId].push({
          ...form,
          customization: form.customization as Record<string, string> | null | undefined,
        });
        return acc;
      },
      {} as Record<string, WorkspaceWithForms["forms"]>,
    );

    return (workspacesData || []).map((ws) => ({
      ...ws,
      forms: (formsByWorkspace[ws.id] || []).toSorted(
        (a: WorkspaceWithForms["forms"][0], b: WorkspaceWithForms["forms"][0]) => {
          switch (sortMode) {
            case "oldest":
              return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            case "alphabetical":
              return (a.title || "").localeCompare(b.title || "");
            case "manual":
              return 0;
            case "recent":
            default:
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
        },
      ),
    }));
  }, [workspacesData, formsData, activeOrgId, isElectricReady, sortMode]);

  // State for workspace dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceWithForms | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<WorkspaceWithForms | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // State for form delete dialog
  const [formDeleteDialogOpen, setFormDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setDeleteConfirmName("");
  }, []);

  const handleDeleteConfirmNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmName(e.target.value),
    [],
  );

  const handleNewWorkspaceNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewWorkspaceName(e.target.value),
    [],
  );

  const handleCloseRenameDialog = useCallback(() => setRenameDialogOpen(false), []);

  const handleDeleteWorkspace = useCallback(async () => {
    if (!workspaceToDelete || deleteConfirmName !== workspaceToDelete.name) return;
    try {
      await deleteWorkspaceLocal(workspaceToDelete.id);
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
      setDeleteConfirmName("");
      router.navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  }, [workspaceToDelete, deleteConfirmName, router]);

  const handleRenameWorkspace = useCallback(async () => {
    if (!workspaceToRename || !newWorkspaceName.trim()) return;
    try {
      await updateWorkspaceName(workspaceToRename.id, newWorkspaceName.trim());
      setRenameDialogOpen(false);
      setWorkspaceToRename(null);
      setNewWorkspaceName("");
    } catch (error) {
      console.error("Failed to rename workspace:", error);
    }
  }, [workspaceToRename, newWorkspaceName]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRenameWorkspace();
      }
    },
    [handleRenameWorkspace],
  );

  const openRenameDialog = (workspace: WorkspaceWithForms) => {
    setWorkspaceToRename(workspace);
    setNewWorkspaceName(workspace.name);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (workspace: WorkspaceWithForms) => {
    setWorkspaceToDelete(workspace);
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleDuplicateForm = useCallback(
    async (form: WorkspaceWithForms["forms"][0]) => {
      try {
        const newForm = await duplicateFormById(form.id);
        toast.success("Form duplicated");
        router.navigate({
          to: "/workspace/$workspaceId/form-builder/$formId/edit",
          params: { workspaceId: newForm.workspaceId, formId: newForm.id },
        });
      } catch (error) {
        console.error("Failed to duplicate form:", error);
        toast.error("Failed to duplicate form");
      }
    },
    [router],
  );

  const handleDeleteForm = useCallback((form: WorkspaceWithForms["forms"][0]) => {
    setFormToDelete({ id: form.id, title: form.title || "Untitled" });
    setFormDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteForm = useCallback(async () => {
    if (!formToDelete) return;
    try {
      await updateFormStatus(formToDelete.id, "archived");
      toast.success("Form deleted");
      if (location.pathname.includes(`/form-builder/${formToDelete.id}`)) {
        router.navigate({ to: "/dashboard" });
      }
      setFormDeleteDialogOpen(false);
      setFormToDelete(null);
    } catch (error) {
      console.error("Failed to delete form:", error);
      toast.error("Failed to delete form");
    }
  }, [formToDelete, location.pathname, router]);

  return (
    <>
      <div className="flex flex-col">
        {/* Favorites Section */}
        {favoriteForms.length > 0 && (
          <SidebarSection label="Favorites" initialOpen action={<></>}>
            {favoriteForms.map((form) => {
              const favTo =
                form.status === "published"
                  ? `/workspace/${form.workspaceId}/form-builder/${form.id}/submissions`
                  : `/workspace/${form.workspaceId}/form-builder/${form.id}/edit`;
              const isFavActive = location.pathname.startsWith(
                `/workspace/${form.workspaceId}/form-builder/${form.id}`,
              );
              return (
                <SidebarItem
                  key={form.id}
                  label={form.title || "Untitled"}
                  to={favTo}
                  isActive={isFavActive}
                  prefix={
                    <ThemedFormIcon
                      icon={form.icon}
                      customization={
                        form.customization as Record<string, string> | null | undefined
                      }
                    />
                  }
                />
              );
            })}
          </SidebarSection>
        )}

        <div className="mt-[15px] space-y-4">
          {isLoading ? (
            ["collection-skeleton-1", "collection-skeleton-2"].map((key) => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {workspaces.map((workspace) => (
                <WorkspaceItemMinimal
                  key={workspace.id}
                  workspace={workspace}
                  submissionCounts={submissionCounts}
                  sortMode={sortMode}
                  onSortChange={handleSortChange}
                  onRename={() => openRenameDialog(workspace)}
                  onDelete={() => openDeleteDialog(workspace)}
                  onDuplicateForm={handleDuplicateForm}
                  onDeleteForm={handleDeleteForm}
                />
              ))}
              {workspaces.length === 0 && (
                <span className="text-muted-foreground/50 text-[11px] px-2 py-1 italic">
                  No workspaces yet
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription render={<div className="space-y-4" />}>
              <p>
                This will permanently delete <strong>"{workspaceToDelete?.name}"</strong> and{" "}
                <strong>
                  {workspaceToDelete?.forms?.length || 0} form
                  {(workspaceToDelete?.forms?.length || 0) !== 1 ? "s" : ""}
                </strong>
                within it. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  Type <strong>{workspaceToDelete?.name}</strong> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={handleDeleteConfirmNameChange}
                  placeholder="Type workspace name to confirm"
                  aria-label="Type to confirm deletion"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmName !== workspaceToDelete?.name}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Workspace Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>Enter a new name for this workspace.</DialogDescription>
          </DialogHeader>
          <Input
            value={newWorkspaceName}
            onChange={handleNewWorkspaceNameChange}
            placeholder="Workspace name"
            aria-label="Workspace name"
            onKeyDown={handleRenameKeyDown}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRenameDialog}>
              Cancel
            </Button>
            <Button onClick={handleRenameWorkspace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Delete Confirmation Dialog */}
      <AlertDialog open={formDeleteDialogOpen} onOpenChange={setFormDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.title}"? This action will move it to
              trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteForm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const ClientSidebarWorkspaces = ({ activeOrgId }: { activeOrgId?: string }) => (
  <ClientOnly fallback={<WorkspacesSkeleton />}>
    <SidebarWorkspacesContent activeOrgId={activeOrgId} />
  </ClientOnly>
);
