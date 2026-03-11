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
import { useNavigate } from "@tanstack/react-router";
import { CopyIcon, MoreHorizontalIcon, TagIcon, Trash2Icon } from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";

interface FormActionsMenuProps {
  form: any;
  workspaceId: string;
}

export function FormActionsMenu({ form, workspaceId }: FormActionsMenuProps) {
  const navigate = useNavigate();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(form?.title || "");

  if (!form) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/forms/${form.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDuplicate = async () => {
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
  };

  const handleDelete = async () => {
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
  };

  const handleRename = async () => {
    if (!newTitle.trim()) return;
    try {
      await updateDoc(form.id, (draft) => {
        draft.title = newTitle.trim();
      });
      setIsRenameOpen(false);
      toast.success("Form renamed");
    } catch {
      toast.error("Failed to rename form");
    }
  };

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
          <DropdownMenuItem
            onClick={() => {
              setNewTitle(form?.title || "");
              setIsRenameOpen(true);
            }}
          >
            <TagIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
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
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Form title"
              aria-label="Form name"
              autoComplete="off"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
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
}
