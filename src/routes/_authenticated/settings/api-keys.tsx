import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircleIcon,
  CheckIcon,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_NAME, APP_API_DOCS_URL } from "@/lib/config/app-config";
import { auth, useSession } from "@/lib/auth/auth-client";

const APIKeysPage = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const loaderData = Route.useLoaderData();

  const { data: apiKeysData } = useQuery({
    ...auth.apiKey.list.queryOptions(),
    initialData: loaderData,
  });
  const apiKeys = apiKeysData?.apiKeys ?? [];

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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={handleOpenCreateDialog}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Create API key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <Empty className="border-border/50 bg-muted/5 mt-4">
          <EmptyMedia variant="icon" className="bg-muted">
            <PlusIcon className="h-6 w-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              Create an API key to access our API and automate your tasks.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={handleOpenCreateDialog} variant="outline" className="mt-2">
            Create your first key
          </Button>
        </Empty>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px] text-muted-foreground py-3 px-4">Name</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Key</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Version</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Permissions</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Last used</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Created at</TableHead>
                <TableHead className="text-muted-foreground py-3 px-4">Created by</TableHead>
                <TableHead className="w-[50px] py-3 px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow
                  key={key.id}
                  className="group border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="py-4 px-4">{key.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs py-4 px-4">
                    {key.start}...{key.prefix}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-4 px-4">2025-02-01</TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="text-[13px] text-foreground">Full access</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-4 px-4">
                    {(key as unknown as { lastUsedAt?: string }).lastUsedAt
                      ? formatDistanceToNow(
                          new Date((key as unknown as { lastUsedAt: string }).lastUsedAt),
                          {
                            addSuffix: true,
                          },
                        )
                      : "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-4 px-4">
                    {formatDistanceToNow(new Date(key.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-4 px-4">
                    {session?.user.name}
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                            aria-label="API key actions"
                          />
                        }
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
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

      <div className="flex items-center gap-1 text-[13px] text-muted-foreground pt-8">
        <span>{APP_NAME}'s API is currently in Beta. Learn more about it on</span>
        <a href={APP_API_DOCS_URL} className="text-foreground hover:underline">
          {APP_API_DOCS_URL}
        </a>
        <span>.</span>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Give your API key a name to identify it later.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm" htmlFor={nameInputId}>
                Name
              </label>
              <Input
                id={nameInputId}
                placeholder="e.g. Production"
                value={newKeyName}
                onChange={handleNewKeyNameChange}
                onKeyDown={handleNewKeyNameKeyDown}
                className="focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseCreateDialog}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateKey}
              disabled={!newKeyName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={handleViewDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">View API key</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800">
              <AlertCircleIcon className="h-5 w-5 shrink-0" />
              <p className="text-[13px]">
                You will only be able to see this key once, store it safely.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-foreground" htmlFor={apiKeyInputId}>
                API key
              </label>
              <div className="relative flex items-center">
                <Input
                  id={apiKeyInputId}
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={createdKey || ""}
                  className="pr-20 font-mono text-xs h-10 bg-muted/20"
                />
                <div className="absolute right-1 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleToggleShowKey}
                    aria-label="Toggle key visibility"
                  >
                    {showKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleCopyCreatedKey}
                    aria-label="Copy API key"
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-left">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[80px] px-6 py-2 h-auto"
              onClick={handleCloseViewDialog}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your API key and any
              applications using it will no longer be able to authenticate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Delete API Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/settings/api-keys")({
  component: APIKeysPage,
  loader: async ({ context }) => {
    if (typeof window === "undefined") {
      return { apiKeys: [], total: 0, limit: undefined, offset: undefined };
    }
    return await context.queryClient.ensureQueryData({
      ...auth.apiKey.list.queryOptions(),
      revalidateIfStale: true,
    });
  },
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
