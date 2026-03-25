import { ThemedFormIcon } from "@/components/icon-picker";
import { SidebarItem } from "@/components/sidebar-item";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlphabeticalIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockRewindIcon,
  CopyIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  Pencil2Icon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { SidebarSection } from "@/components/ui/sidebar-section";
import { createFormLocal } from "@/db-collections/collections";
import { cn } from "@/lib/utils";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";

export type WorkspaceWithForms = {
  id: string;
  organizationId: string;
  createdByUserId?: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  forms: Array<{
    id: string;
    title: string | null;
    updatedAt: string;
    workspaceId: string;
    icon?: string | null;
    status: string;
    customization?: Record<string, string> | null;
  }>;
};

export interface WorkspaceItemMinimalProps {
  workspace: WorkspaceWithForms;
  submissionCounts: Map<string, number>;
  sortMode: string;
  onSortChange: (mode: "recent" | "oldest" | "alphabetical" | "manual") => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicateForm: (form: WorkspaceWithForms["forms"][0]) => void;
  onDeleteForm: (form: WorkspaceWithForms["forms"][0]) => void;
}

export const WorkspaceItemMinimal = ({
  workspace,
  submissionCounts,
  sortMode,
  onSortChange,
  onRename,
  onDelete,
  onDuplicateForm,
  onDeleteForm,
}: WorkspaceItemMinimalProps) => {
  const router = useRouter();
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [sortExpanded, setSortExpanded] = useState(false);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    if (!open) setSortExpanded(false);
  }, []);

  const sortOptions = [
    { value: "recent", label: "Recent First", icon: CalendarIcon },
    { value: "oldest", label: "Oldest First", icon: ClockRewindIcon },
    { value: "alphabetical", label: "Alphabetical", icon: AlphabeticalIcon },
    { value: "manual", label: "Manual", icon: CopyIcon },
  ] as const;

  const currentSort = sortOptions.find((o) => o.value === sortMode) || sortOptions[0];

  const handleCreateForm = useCallback(async () => {
    setIsCreatingForm(true);
    try {
      const newForm = await createFormLocal(workspace.id);
      router.navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: workspace.id, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to create form:", error);
    } finally {
      setIsCreatingForm(false);
    }
  }, [workspace.id, router]);

  return (
    <SidebarSection
      label={workspace.name}
      initialOpen={true}
      action={
        <DropdownMenu onOpenChange={handlePopoverOpenChange}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="p-[5px] mr-1 rounded-lg overflow-hidden hover:bg-sidebar-active text-muted-foreground hover:text-foreground"
                title="More options"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48" sideOffset={4}>
            <Collapsible open={sortExpanded} onOpenChange={setSortExpanded}>
              <CollapsibleTrigger className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 w-full overflow-hidden text-[13px] transition-colors cursor-pointer text-foreground">
                <currentSort.icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{currentSort.label}</span>
                <ChevronDownIcon
                  className={cn("size-3 shrink-0 transition-transform duration-200")}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden h-(--collapsible-panel-height) transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
                <div className="flex flex-col pt-1">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        closeOnClick={false}
                        onClick={() => {
                          onSortChange(option.value);
                          setSortExpanded(false);
                        }}
                        className={cn(sortMode === option.value && "bg-black/5")}
                      >
                        <option.icon />
                        <span className="flex-1 text-left">{option.label}</span>
                        {sortMode === option.value && <CheckIcon className="size-3 shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleCreateForm} disabled={isCreatingForm}>
                {isCreatingForm ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon />}
                <span className="flex-1 text-left">New form</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil2Icon />
                <span className="flex-1 text-left">Rename</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <TrashIcon />
                <span className="flex-1 text-left">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {workspace.forms.map((form) => (
        <WorkspaceFormMinimal
          key={form.id}
          form={form}
          workspaceId={workspace.id}
          submissionCount={submissionCounts.get(form.id) || 0}
          onDuplicate={() => onDuplicateForm(form)}
          onDelete={() => onDeleteForm(form)}
        />
      ))}
      {workspace.forms.length === 0 && (
        <span className="text-muted-foreground/50 text-[11px] px-8 py-1 italic">No forms yet</span>
      )}
    </SidebarSection>
  );
};

const getFormIcon = (
  _title: string,
  icon?: string | null,
  customization?: Record<string, string> | null,
) => <ThemedFormIcon icon={icon} customization={customization} />;

interface WorkspaceFormMinimalProps {
  form: {
    id: string;
    title: string;
    icon?: string | null;
    workspaceId: string;
    status: string;
    customization?: Record<string, string> | null;
  };
  workspaceId: string;
  submissionCount: number;
  onDuplicate: () => void;
  onDelete: () => void;
}

const WorkspaceFormMinimal = ({
  form,
  workspaceId,
  submissionCount,
  onDuplicate,
  onDelete,
}: WorkspaceFormMinimalProps) => {
  const location = useLocation();
  const isPublishedForm = form.status === "published";
  const linkOptions = {
    to: isPublishedForm
      ? "/workspace/$workspaceId/form-builder/$formId/submissions"
      : "/workspace/$workspaceId/form-builder/$formId/edit",
    params: { workspaceId, formId: form.id },
  } as const;
  const isActive = location.pathname.startsWith(
    `/workspace/${workspaceId}/form-builder/${form.id}`,
  );
  const label = form.title || "Untitled";

  const prefix = getFormIcon(label, form.icon, form.customization);

  const isPublished = form.status === "published";
  const showCount = isPublished && submissionCount > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div />}>
        <SidebarItem label={label} linkOptions={linkOptions} isActive={isActive} prefix={prefix}>
          {showCount && (
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 tracking-5 font-case">
              {submissionCount}
            </span>
          )}
        </SidebarItem>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[195px] rounded-2xl p-1 shadow-popover border-0 outline-hidden">
        <div className="text-[12px] text-muted-foreground px-2 py-1.5">Form</div>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="w-full justify-start gap-1.5 rounded-lg px-2 py-1.5 h-[26px] text-[13px] transition-colors text-foreground/80 [&_svg]:size-3.5"
        >
          <CopyIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Duplicate</span>
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-full justify-start gap-1.5 rounded-lg px-2 py-1.5 h-[26px] text-[13px] transition-colors text-red-500/70 hover:bg-red-500/5 focus:bg-red-500/5[&_svg]:size-3.5"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
