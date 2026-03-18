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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { duplicateForm, updateDoc, updateFormStatus } from "@/db-collections/form.collections";
import type { Form } from "@/db-collections/form.collections";
import { useNavigate } from "@tanstack/react-router";
import { CopyIcon, MoreHorizontalIcon, TagIcon, Trash2Icon } from "@/components/ui/icons";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface FormActionsMenuProps {
  form: Form | null;
  workspaceId: string;
}

export const FormActionsMenu = ({ form, workspaceId }: FormActionsMenuProps) => {
  const navigate = useNavigate();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(form?.title || "");

  const handleOpenRename = useCallback(() => {
    setNewTitle(form?.title || "");
    setIsRenameOpen(true);
  }, [form?.title]);

  const handleOpenDelete = useCallback(() => setIsDeleteOpen(true), []);

  const handleCloseRename = useCallback(() => setIsRenameOpen(false), []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value),
    [],
  );

  const handleDuplicate = useCallback(async () => {
    if (!form) return;
    try {
      const newForm = await duplicateForm(form);
      toast.success("Form duplicated");
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId, formId: newForm.id },
      });
    } catch {
      toast.error("Failed to duplicate form");
    }
  }, [form, navigate, workspaceId]);

  const handleDelete = useCallback(async () => {
    if (!form) return;
    try {
      await updateFormStatus(form.id, "archived");
      toast.success("Form deleted");
      navigate({
        to: "/workspace/$workspaceId",
        params: { workspaceId },
      });
    } catch {
      toast.error("Failed to delete form");
    }
  }, [form, navigate, workspaceId]);

  const handleRename = useCallback(async () => {
    if (!form || !newTitle.trim()) return;
    try {
      await updateDoc(form.id, (draft) => {
        draft.title = newTitle.trim();
      });
      setIsRenameOpen(false);
      toast.success("Form renamed");
    } catch {
      toast.error("Failed to rename form");
    }
  }, [form, newTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleRename();
    },
    [handleRename],
  );

  if (!form) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors mt-1"
              aria-label="More actions"
            />
          }
        >
          <MoreHorizontalIcon className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleOpenRename}>
            <TagIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename form</DialogTitle>
            <DialogDescription>Enter a new title for this form.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={handleTitleChange}
              placeholder="Form title"
              aria-label="Form name"
              autoComplete="off"
              autoFocus
              onKeyDown={handleTitleKeyDown}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRename}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action will move it to trash and
              cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
