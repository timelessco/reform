import { SidebarItem } from "@/components/sidebar-item";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlphabeticalIcon,
  CalendarIcon,
  ClockRewindIcon,
  CopyIcon,
  MoreHorizontalIcon,
  Pencil2Icon,
  PlusIcon,
} from "@/components/ui/sidebar-icons";
import { SidebarSection } from "@/components/ui/sidebar-section";
import { createFormLocal } from "@/db-collections";
import { cn } from "@/lib/utils";
import { useLocation, useRouter } from "@tanstack/react-router";
import {
  Check,
  Feather,
  Github,
  Loader2,
  Star,
  TrashIcon,
  Zap,
} from "lucide-react";
import { useState } from "react";

export type WorkspaceWithForms = {
  id: string;
  organizationId: string;
  createdByUserId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  forms: Array<{
    id: string;
    title: string;
    updatedAt: string;
    workspaceId: string;
    icon?: string | null;
    status: string;
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

export function WorkspaceItemMinimal({
  workspace,
  submissionCounts,
  sortMode,
  onSortChange,
  onRename,
  onDelete,
  onDuplicateForm,
  onDeleteForm,
}: WorkspaceItemMinimalProps) {
  const router = useRouter();
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  const handleCreateForm = async () => {
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
  };

  return (
    <SidebarSection
      label={workspace.name}
      initialOpen={true}
      action={
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size='icon-sm'
                className="size-[26px] p-[5px] rounded-lg overflow-hidden hover:bg-sidebar-active text-muted-foreground hover:text-foreground"
                title="More options"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48" sideOffset={4}>
            <div className="flex flex-col">
              <div className="px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground tracking-[0.24px] leading-tight">
                Sort by
              </div>
              {[
                { value: "recent", label: "Recent First", icon: CalendarIcon },
                {
                  value: "oldest",
                  label: "Oldest First",
                  icon: ClockRewindIcon,
                },
                {
                  value: "alphabetical",
                  label: "Alphabetical",
                  icon: AlphabeticalIcon,
                },
                { value: "manual", label: "Manual", icon: CopyIcon },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    onSortChange(
                      option.value as
                        | "recent"
                        | "oldest"
                        | "alphabetical"
                        | "manual",
                    )
                  }
                  className={cn(
                    "h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors cursor-pointer",
                    sortMode === option.value
                      ? "bg-black/5 text-foreground"
                      : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <option.icon className="size-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-left">{option.label}</span>
                  {sortMode === option.value && (
                    <Check className="size-3 shrink-0" strokeWidth={2} />
                  )}
                </Button>
              ))}
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground tracking-[0.24px] leading-tight">
                Workspace
              </div>
              <button
                type="button"
                onClick={handleCreateForm}
                disabled={isCreatingForm}
                className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                {isCreatingForm ? (
                  <Loader2
                    className="size-4 animate-spin shrink-0"
                    strokeWidth={1.5}
                  />
                ) : (
                  <PlusIcon
                    className="size-4 shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                <span className="flex-1 text-left">New form</span>
              </button>
              <button
                type="button"
                onClick={onRename}
                className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground"
              >
                <Pencil2Icon
                  className="size-4 shrink-0"
                  strokeWidth={1.5}
                />
                <span className="flex-1 text-left">Rename</span>
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-red-500/70 hover:text-red-500 hover:bg-red-500/5"
              >
                <TrashIcon className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-left">Delete</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
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
        <span className="text-muted-foreground/50 text-[11px] px-8 py-1 italic">
          No forms yet
        </span>
      )}
    </SidebarSection>
  );
}

const getFormIcon = (title: string, icon?: string | null) => {
  const iconWrapper =
    "rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-form-icon-border shrink-0";
  const iconFill = "text-foreground fill-foreground";

  if (icon && isEmoji(icon))
    return (
      <div className={`bg-form-icon-bg ${iconWrapper}`}>
        <span className="text-xs leading-none">{icon}</span>
      </div>
    );

  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("contact"))
    return (
      <div className={`bg-form-icon-bg shadow-sm ${iconWrapper}`}>
        <Star className="h-3 w-3 fill-foreground text-foreground" />
      </div>
    );

  if (lowerTitle.includes("employee intake"))
    return (
      <div className={`bg-secondary ${iconWrapper}`}>
        <div
          className="size-2 bg-foreground rounded-full"
          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
        />
      </div>
    );

  if (lowerTitle.includes("onboarding") && !lowerTitle.includes("client"))
    return (
      <div className={`bg-secondary ${iconWrapper}`}>
        <Zap className={`h-3 w-3 ${iconFill}`} strokeWidth={1} />
      </div>
    );

  if (
    lowerTitle.includes("client onboarding") ||
    lowerTitle.includes("feedback")
  )
    return (
      <div className={`bg-secondary ${iconWrapper}`}>
        <Feather className="h-3 w-3 text-foreground" strokeWidth={1.5} />
      </div>
    );

  if (lowerTitle.includes("open source"))
    return (
      <div className={`bg-secondary ${iconWrapper}`}>
        <Github className={`h-3 w-3 ${iconFill}`} strokeWidth={1} />
      </div>
    );

  return (
    <div className={`bg-form-icon-bg ${iconWrapper}`}>
      <span className="text-xs leading-none">✨</span>
    </div>
  );
};

function isEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRange =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return str.length <= 4 && emojiRange.test(str);
}

interface WorkspaceFormMinimalProps {
  form: {
    id: string;
    title: string;
    icon?: string | null;
    workspaceId: string;
    status: string;
  };
  workspaceId: string;
  submissionCount: number;
  onDuplicate: () => void;
  onDelete: () => void;
}

function WorkspaceFormMinimal({
  form,
  workspaceId,
  submissionCount,
  onDuplicate,
  onDelete,
}: WorkspaceFormMinimalProps) {
  const location = useLocation();
  const isPublishedForm = form.status === "published";
  const to = isPublishedForm
    ? `/workspace/${workspaceId}/form-builder/${form.id}/submissions`
    : `/workspace/${workspaceId}/form-builder/${form.id}/edit`;
  const isActive = location.pathname.startsWith(
    `/workspace/${workspaceId}/form-builder/${form.id}`,
  );
  const label = form.title || "Untitled";

  const prefix = getFormIcon(label, form.icon);

  const isPublished = form.status === "published";
  const showCount = isPublished && submissionCount > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div />}>
        <SidebarItem label={label} to={to} isActive={isActive} prefix={prefix}>
          {showCount && (
            <span className="text-[11px] tracking-[0.33px] text-muted-foreground tabular-nums shrink-0 font-medium leading-tight font-case">
              {submissionCount}
            </span>
          )}
        </SidebarItem>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[195px] rounded-2xl p-1 shadow-popover border-0 outline-hidden">
        <div className="text-[12px] font-medium text-muted-foreground px-2 py-1.5 tracking-[0.24px]">
          Form
        </div>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="w-full justify-start gap-1.5 rounded-lg px-2 py-1.5 h-[26px] text-[13px] font-medium tracking-[0.13px] transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:size-3.5"
        >
          <CopyIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span className="flex-1 text-left">Duplicate</span>
        </ContextMenuItem>
        <ContextMenuSeparator className="my-1 h-px bg-border mx-0" />
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-full justify-start gap-1.5 rounded-lg px-2 py-1.5 h-[26px] text-[13px] font-medium tracking-[0.13px] transition-colors text-red-500/70 hover:bg-red-500/5 focus:bg-red-500/5 focus:text-red-500 [&_svg]:size-3.5"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span className="flex-1 text-left">Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
