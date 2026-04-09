import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth/auth-client";
import { APP_NAME } from "@/lib/config/app-config";

export const ApiKeysContent = () => {
  const queryClient = useQueryClient();

  const { data: apiKeysData } = useQuery({
    ...auth.apiKey.list.queryOptions(),
  });
  const apiKeys = Array.isArray(apiKeysData) ? apiKeysData : [];

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameInputId = useId();
  const apiKeyInputId = useId();
  const [apiKeyToDelete, setApiKeyToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const createMutation = useMutation(
    auth.apiKey.create.mutationOptions({
      onSuccess: (data) => {
        setCreatedKey(data.key);
        setIsCreateDialogOpen(false);
        setIsViewDialogOpen(true);
        setNewKeyName("");
        queryClient.invalidateQueries({
          queryKey: auth.apiKey.list.queryKey(),
        });
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Failed to create API key");
      },
    }),
  );

  const deleteMutation = useMutation(
    auth.apiKey.delete.mutationOptions({
      onSuccess: () => {
        toast.success("API key deleted");
        queryClient.invalidateQueries({
          queryKey: auth.apiKey.list.queryKey(),
        });
        setIsDeleteDialogOpen(false);
        setApiKeyToDelete(null);
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete API key");
      },
    }),
  );

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    createMutation.mutate({
      name: newKeyName,
    });
  }, [newKeyName, createMutation]);

  const handleDeleteKey = useCallback(async () => {
    if (!apiKeyToDelete) return;
    deleteMutation.mutate({
      keyId: apiKeyToDelete,
    });
  }, [apiKeyToDelete, deleteMutation]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleOpenCreateDialog = useCallback(() => setIsCreateDialogOpen(true), []);
  const handleCloseCreateDialog = useCallback(() => setIsCreateDialogOpen(false), []);
  const handleCloseViewDialog = useCallback(() => setIsViewDialogOpen(false), []);
  const handleToggleShowKey = useCallback(() => setShowKey((prev) => !prev), []);
  const handleCopyCreatedKey = useCallback(
    () => createdKey && copyToClipboard(createdKey),
    [createdKey, copyToClipboard],
  );

  const handleNewKeyNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value),
    [],
  );

  const handleNewKeyNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => e.key === "Enter" && handleCreateKey(),
    [handleCreateKey],
  );

  const handleViewDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setIsViewDialogOpen(false);
      setCreatedKey(null);
      setShowKey(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button
          onClick={handleOpenCreateDialog}
          size="sm"
          prefix={<PlusIcon className="size-3.5" />}
        >
          Create API key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p className="mb-3">No API keys yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreateDialog}
            className="rounded-lg"
          >
            Create your first key
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="text-muted-foreground py-2.5 px-3 text-xs font-medium">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground py-2.5 px-3 text-xs font-medium">
                  Key
                </TableHead>
                <TableHead className="text-muted-foreground py-2.5 px-3 text-xs font-medium">
                  Created
                </TableHead>
                <TableHead className="w-[50px] py-2.5 px-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id} className="hover:bg-muted/30">
                  <TableCell className="py-2.5 px-3 text-sm font-medium">{key.name}</TableCell>
                  <TableCell className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                    {key.start}...{key.prefix}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(key.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => {
                            setApiKeyToDelete(key.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2Icon className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <span>{APP_NAME}'s API is currently in Beta.</span>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription className="text-xs">
              Give your API key a name to identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="text-sm mb-1.5 block" htmlFor={nameInputId}>
              Name
            </label>
            <Input
              id={nameInputId}
              placeholder="e.g. Production"
              value={newKeyName}
              onChange={handleNewKeyNameChange}
              onKeyDown={handleNewKeyNameKeyDown}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCreateDialog}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateKey}
              disabled={!newKeyName.trim() || createMutation.isPending}
              className="rounded-lg"
            >
              {createMutation.isPending && <Loader2Icon className="animate-spin mr-2 h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={handleViewDialogOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>View API key</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-amber-800 text-xs">
              You will only be able to see this key once, store it safely.
            </div>

            <div>
              <label className="text-sm mb-1.5 block" htmlFor={apiKeyInputId}>
                API key
              </label>
              <div className="relative flex items-center">
                <Input
                  id={apiKeyInputId}
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={createdKey || ""}
                  className="pr-20 font-mono text-xs h-9 bg-muted/20"
                />
                <div className="absolute right-1 flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleToggleShowKey}
                    aria-label="Toggle key visibility"
                  >
                    {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopyCreatedKey}
                    aria-label="Copy API key"
                  >
                    {copied ? (
                      <span className="text-green-600 text-xs">Copied</span>
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleCloseViewDialog} className="rounded-lg min-w-[80px]">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. Any applications using this key will no longer be able
              to authenticate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2Icon className="animate-spin mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
