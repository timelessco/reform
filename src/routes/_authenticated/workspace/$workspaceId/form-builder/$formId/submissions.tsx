import { cn } from "@/lib/utils";
import { MULTI_SELECT_COLORS } from "@/components/ui/form-option-item-constants";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridVirtualTable } from "@/components/ui/data-grid-virtual-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EDITABLE_FIELD_TYPES } from "@/lib/editor/transform-plate-for-preview";
import { formatBytes } from "@/hooks/use-file-upload";
import {
  deleteSubmission,
  deleteSubmissionsBulk,
  getSubmissionsBootstrap,
  getSubmissionsByFormIdPaginated,
} from "@/lib/server-fn/submissions";
import type { SerializedSubmission, SubmissionCursor } from "@/lib/server-fn/submissions";
import {
  getEditableFields,
  transformPlateStateToFormElements,
} from "@/lib/editor/transform-plate-to-form";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  Cell,
  ColumnDef,
  ColumnPinningState,
  Row,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import { ChevronDownIcon, FilterIcon, Trash2Icon, XIcon } from "@/components/ui/icons";
import { Columns, Download, FileText, Paperclip, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Value } from "platejs";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { HOTKEYS, formatForDisplay } from "@/lib/hotkeys";

// Field status types for color coding
type FieldStatus = "current" | "deleted";
const EMPTY_LABELS: Record<string, string> = {};
type PaginatedSubmissionsPage = {
  submissions: SerializedSubmission[];
  nextCursor?: SubmissionCursor;
};

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

const getPaginatedSubmissionsPage = (
  formId: string,
  cursor?: SubmissionCursor,
): Promise<PaginatedSubmissionsPage> =>
  getSubmissionsByFormIdPaginated({
    data: { formId, cursor },
  }) as Promise<PaginatedSubmissionsPage>;

const formatSubmissionValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "{object}";
  }
};

type UploadedFileValue = {
  url: string;
  name: string;
  size: number;
  type: string;
};

const isUploadedFileValue = (value: unknown): value is UploadedFileValue =>
  !!value &&
  typeof value === "object" &&
  "url" in value &&
  typeof (value as { url: unknown }).url === "string";

const FileTypeIcon = ({ type, className }: { type: string; className?: string }) => {
  if (type === "application/pdf") {
    return <FileText className={cn("text-red-500", className)} />;
  }
  if (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileText className={cn("text-blue-500", className)} />;
  }
  return <Paperclip className={cn("text-muted-foreground", className)} />;
};

const csvFormat = (value: unknown): string => {
  if (isUploadedFileValue(value)) return value.url;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
};

type FieldOption = { value: string; label: string };

const SubmissionCell = ({
  value,
  fieldType,
  onPreview,
  options,
}: {
  value: unknown;
  fieldType: string;
  onPreview?: (file: UploadedFileValue) => void;
  options?: FieldOption[];
}) => {
  const labelFor = (raw: unknown): string => {
    const s = String(raw);
    if (!options) return s;
    const match = options.find((o) => o.value === s);
    return match?.label ?? s;
  };
  const text = formatSubmissionValue(value);
  if (text === "-") {
    return <span className="text-[13px] text-muted-foreground">-</span>;
  }

  switch (fieldType) {
    case "Email":
      return (
        <a
          href={`mailto:${text}`}
          className="text-[13px] truncate max-w-[300px] block text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </a>
      );
    case "Link":
      return (
        <a
          href={text.startsWith("http") ? text : `https://${text}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] truncate max-w-[300px] block text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </a>
      );
    case "Date":
      return (
        <span className="text-[13px] truncate max-w-[300px] block tabular-nums">
          {(() => {
            try {
              return new Date(text).toLocaleDateString();
            } catch {
              return text;
            }
          })()}
        </span>
      );
    case "Time":
    case "Phone":
    case "Number":
      return <span className="text-[13px] truncate max-w-[300px] block tabular-nums">{text}</span>;
    case "Checkbox":
    case "MultiChoice":
    case "MultiSelect":
    case "Ranking":
    default: {
      const items = Array.isArray(value) ? value : null;
      if (!items) {
        return <span className="text-[13px] truncate max-w-[300px] block">{labelFor(value)}</span>;
      }
      const useColors = fieldType === "MultiSelect" && options;
      return (
        <div className="flex flex-wrap gap-1 max-w-[300px]">
          {items.map((item) => {
            const colorIdx = useColors ? options.findIndex((o) => o.value === String(item)) : -1;
            const color =
              colorIdx >= 0 ? MULTI_SELECT_COLORS[colorIdx % MULTI_SELECT_COLORS.length] : null;
            return (
              <span
                key={String(item)}
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px]",
                  color ? cn(color.bg, color.text) : "bg-secondary text-secondary-foreground",
                )}
              >
                {labelFor(item)}
              </span>
            );
          })}
        </div>
      );
    }
    case "FileUpload": {
      // Legacy: bare string filename from old submissions
      if (typeof value === "string") {
        return (
          <span className="text-[13px] text-muted-foreground italic truncate max-w-[180px] block">
            {value}
          </span>
        );
      }
      if (!isUploadedFileValue(value)) {
        return <span className="text-[13px] text-muted-foreground">-</span>;
      }
      const file = value;
      const isImage = file.type.startsWith("image/");
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.(file);
          }}
          title={`${file.name} • ${formatBytes(file.size)}`}
          className="flex w-full items-center justify-center gap-2 max-w-[180px] group cursor-pointer"
        >
          {isImage ? (
            <img
              src={file.url}
              alt=""
              loading="lazy"
              className="h-8 w-auto max-w-[64px] rounded object-contain border border-border/40 shrink-0"
            />
          ) : (
            <FileTypeIcon type={file.type} className="h-8 w-8 shrink-0" />
          )}
          {!isImage && (
            <span className="text-[13px] truncate text-muted-foreground group-hover:text-foreground">
              {file.name}
            </span>
          )}
        </button>
      );
    }
  }
};

const toSubmissionColumn = <TValue,>(
  column: ColumnDef<SerializedSubmission, TValue>,
): ColumnDef<SerializedSubmission, unknown> => column as ColumnDef<SerializedSubmission, unknown>;

const SubmissionsPage = () => {
  const { formId } = Route.useParams();
  const queryClient = useQueryClient();
  Route.useLoaderData(); // ensure loader has primed the query cache
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "partial">("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [fieldStatusFilter] = useState<Set<FieldStatus>>(new Set(["current", "deleted"]));
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFileValue | null>(null);
  const openPreview = useCallback((file: UploadedFileValue) => setPreviewFile(file), []);
  const closePreview = useCallback(() => setPreviewFile(null), []);
  const handleSetActiveTabAll = useCallback(() => setActiveTab("all"), []);
  const handleSetActiveTabCompleted = useCallback(() => setActiveTab("completed"), []);
  const handleSetActiveTabPartial = useCallback(() => setActiveTab("partial"), []);
  const handleGlobalFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value),
    [],
  );
  const handleClearSelection = useCallback(() => setRowSelection({}), []);

  // 1. Bootstrap: published form content + total count + historical field labels (1 round-trip)
  const { data: bootstrapData } = useQuery({
    queryKey: ["submissionsBootstrap", formId],
    queryFn: () => getSubmissionsBootstrap({ data: { formId } }),
    staleTime: 1000 * 60 * 10,
  });
  const publishedContent = bootstrapData?.form?.content;
  const totalCount = bootstrapData?.totalCount ?? 0;
  const historicalLabels = bootstrapData?.fieldLabels ?? EMPTY_LABELS;

  // 2. Fetch Submissions via infinite query (independent of bootstrap)
  const {
    data: submissionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingSubmissions,
  } = useInfiniteQuery({
    queryKey: ["submissions", formId],
    queryFn: async ({ pageParam }: { pageParam: SubmissionCursor | undefined }) =>
      getPaginatedSubmissionsPage(formId, pageParam),
    initialPageParam: undefined as SubmissionCursor | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const allSubmissions: SerializedSubmission[] = useMemo(
    () => submissionsData?.pages?.flatMap((page) => page?.submissions ?? []) ?? [],
    [submissionsData],
  );

  // Client-side filter based on activeTab
  const { completedCount, partialCount } = useMemo(() => {
    let completed = 0;
    for (const s of allSubmissions) {
      if (s.isCompleted) completed++;
    }
    return {
      completedCount: completed,
      partialCount: allSubmissions.length - completed,
    };
  }, [allSubmissions]);
  const submissions = useMemo(() => {
    if (activeTab === "completed")
      return allSubmissions.filter((s: SerializedSubmission) => s.isCompleted);
    if (activeTab === "partial")
      return allSubmissions.filter((s: SerializedSubmission) => !s.isCompleted);
    return allSubmissions;
  }, [allSubmissions, activeTab]);

  // Delete handler (needed in column definition)
  const handleDelete = useCallback(
    async (submissionId: string) => {
      await deleteSubmission({ data: { id: submissionId, formId } });
      queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
    },
    [formId, queryClient],
  );

  // Memoize the form elements transformation (used by both orphanedFieldNames and columns)
  const formElements = useMemo(() => {
    if (!publishedContent) return null;
    return transformPlateStateToFormElements(publishedContent as Value);
  }, [publishedContent]);

  // 3. Derive stable orphaned field names from submissions
  // This prevents columns from rebuilding when submission data reference changes
  const orphanedFieldNamesRef = useRef<Set<string>>(new Set());
  const orphanedFieldNames = useMemo(() => {
    const currentFieldNames = new Set<string>();
    if (formElements) {
      const editableFields = getEditableFields(formElements);
      editableFields
        .filter((field) => EDITABLE_FIELD_TYPES.has(field.fieldType))
        .forEach((field) => currentFieldNames.add(field.name));
    }

    const orphaned = new Set<string>();
    allSubmissions.forEach((submission) => {
      if (submission.data && typeof submission.data === "object") {
        Object.keys(submission.data as Record<string, unknown>).forEach((key) => {
          if (!currentFieldNames.has(key)) {
            orphaned.add(key);
          }
        });
      }
    });

    // Only update ref if the set actually changed
    const prevKeys = [...orphanedFieldNamesRef.current].toSorted().join(",");
    const nextKeys = [...orphaned].toSorted().join(",");
    if (prevKeys !== nextKeys) {
      orphanedFieldNamesRef.current = orphaned;
    }
    return orphanedFieldNamesRef.current;
  }, [allSubmissions, formElements]);

  // 4. Derive Columns from PUBLISHED Form Content (not draft)
  // Track field counts by status for the filter badge
  const { columns } = useMemo(() => {
    const columnHelper = createColumnHelper<SerializedSubmission>();
    const counts: Record<FieldStatus, number> = { current: 0, deleted: 0 };

    // Select column for row selection - fixed width, non-resizable to prevent overlap with actions
    const baseColumns: ColumnDef<SerializedSubmission, unknown>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        size: 48,
        minSize: 48,
        maxSize: 48,
        meta: {
          // headerClassName: "w-48",
          // cellClassName: "w-48",
        },
        enableSorting: false,
        enableHiding: false,
        enablePinning: false,
        enableResizing: false,
      },
      // Submission Date column - minSize prevents action buttons from truncating into select column
      toSubmissionColumn(
        columnHelper.accessor("createdAt", {
          header: ({ column }) => <DataGridColumnHeader column={column} title="Submitted at" />,
          cell: (info) => (
            <div className="flex items-center justify-between gap-2 group/row min-w-0">
              <span className="text-[13px] truncate min-w-0">
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                }).format(new Date(info.getValue()))}
              </span>
              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete submission"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(info.row.original.id);
                  }}
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ),
          id: "submitted_at",
          size: 200,
          minSize: 140,
        }),
      ),
    ];

    // Dynamic columns based on PUBLISHED form fields (current fields)
    if (formElements) {
      const editableFields = getEditableFields(formElements);

      const inputFields = editableFields.filter((field) =>
        EDITABLE_FIELD_TYPES.has(field.fieldType),
      );

      for (const field of inputFields) {
        const status: FieldStatus = "current";
        counts.current++;

        if (fieldStatusFilter.has(status)) {
          baseColumns.push(
            toSubmissionColumn(
              columnHelper.accessor((row) => row.data?.[field.name], {
                id: field.name,
                header: ({ column }) => (
                  <DataGridColumnHeader
                    column={column}
                    title={("label" in field ? field.label : "") || field.name}
                    icon={
                      <span className="block h-2.5 w-2.5 rounded-full border-[1.5px] border-emerald-500" />
                    }
                  />
                ),
                cell: (info) => (
                  <SubmissionCell
                    value={info.getValue()}
                    fieldType={field.fieldType}
                    onPreview={openPreview}
                    options={"options" in field ? (field.options as FieldOption[]) : undefined}
                  />
                ),
                size: 150,
                meta: {
                  headerTitle: ("label" in field ? field.label : "") || field.name,
                },
              }),
            ),
          );
        }
      }
    }

    // Add columns for orphaned fields (deleted from current version but have data)
    counts.deleted = orphanedFieldNames.size;
    orphanedFieldNames.forEach((fieldName) => {
      const status: FieldStatus = "deleted";
      const resolvedLabel = historicalLabels[fieldName] ?? fieldName;

      // Only add if status filter includes this status
      if (fieldStatusFilter.has(status)) {
        baseColumns.push(
          toSubmissionColumn(
            columnHelper.accessor((row) => row.data?.[fieldName], {
              id: fieldName,
              header: ({ column }) => (
                <DataGridColumnHeader
                  column={column}
                  title={resolvedLabel}
                  icon={
                    <span className="block h-2.5 w-2.5 rounded-full border-[1.5px] border-red-500" />
                  }
                />
              ),
              cell: (info) => (
                <SubmissionCell
                  value={info.getValue()}
                  fieldType="FileUpload"
                  onPreview={openPreview}
                />
              ),
              size: 150,
              meta: {
                headerTitle: resolvedLabel,
              },
            }),
          ),
        );
      }
    });

    return { columns: baseColumns, fieldCounts: counts };
  }, [
    formElements,
    orphanedFieldNames,
    fieldStatusFilter,
    handleDelete,
    openPreview,
    historicalLabels,
  ]);

  const table = useReactTable({
    data: submissions,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnPinning,
      columnOrder,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
    columnResizeMode: "onChange",
    getRowId: (row) => row.id,
  });

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} submission${selectedIds.length > 1 ? "s" : ""}?`,
    );
    if (!confirmed) return;

    await deleteSubmissionsBulk({
      data: { formId, submissionIds: selectedIds },
    });
    queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
    setRowSelection({});
  }, [formId, queryClient, rowSelection]);

  // Shared CSV download helper
  const downloadCSV = useCallback(
    (rows: Row<SerializedSubmission>[], filename: string) => {
      if (rows.length === 0) return;

      const headers = columns
        .filter((col) => col.id !== "select")
        .map((col) => {
          if (typeof col.header === "string") return col.header;
          if (col.id === "submitted_at") return "Submitted At";
          return col.id || "Field";
        })
        .join(",");

      const csvRows = rows
        .map((row) =>
          row
            .getVisibleCells()
            .filter((cell: Cell<SerializedSubmission, unknown>) => cell.column.id !== "select")
            .map((cell: Cell<SerializedSubmission, unknown>) => {
              const formatted = csvFormat(cell.getValue()).replaceAll('"', '""');
              return `"${formatted}"`;
            })
            .join(","),
        )
        .join("\n");

      const csv = `${headers}\n${csvRows}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    [columns],
  );

  // Export selected rows as CSV
  const handleExportSelected = useCallback(() => {
    downloadCSV(table.getSelectedRowModel().rows, `submissions-selected-${formId}.csv`);
  }, [downloadCSV, formId, table]);

  const handleDownloadCSV = useCallback(() => {
    downloadCSV(table.getRowModel().rows, `submissions-${formId}.csv`);
  }, [downloadCSV, formId, table]);

  // Keyboard shortcuts (scoped to submissions page)
  const hasSelection = Object.keys(rowSelection).length > 0;

  useHotkey(
    HOTKEYS.SUBMISSIONS_SELECT_ALL,
    () => {
      table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());
    },
    { conflictBehavior: "replace", ignoreInputs: true },
  );

  useHotkey(HOTKEYS.SUBMISSIONS_EXPORT, () => handleExportSelected(), {
    enabled: hasSelection,
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  useHotkey(HOTKEYS.SUBMISSIONS_DELETE, () => handleBulkDelete(), {
    enabled: hasSelection,
    ignoreInputs: true,
  });

  useHotkey(HOTKEYS.SUBMISSIONS_CLEAR_SELECTION, () => setRowSelection({}), {
    enabled: hasSelection,
    ignoreInputs: true,
  });

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background">
      {/* Filter Controls Row */}
      <div className="shrink-0 px-5 pb-4.5 pt-2.5  border-border">
        <div className="flex items-center justify-between">
          {/* Status filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 font-normal bg-accent/60 hover:bg-accent rounded-lg"
                />
              }
            >
              {activeTab === "all" ? "All" : activeTab === "completed" ? "Completed" : "Partial"}
              <span className="opacity-60">
                {activeTab === "all"
                  ? allSubmissions.length
                  : activeTab === "completed"
                    ? completedCount
                    : partialCount}
              </span>
              <ChevronDownIcon className="size-2.5 shrink-0  text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem onClick={handleSetActiveTabAll} className="gap-2">
                All
                <span className="ml-auto text-xs text-muted-foreground">
                  {allSubmissions.length}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetActiveTabCompleted} className="gap-2">
                Completed
                <span className="ml-auto text-xs text-muted-foreground">{completedCount}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSetActiveTabPartial} className="gap-2">
                Partial
                <span className="ml-auto text-xs text-muted-foreground">{partialCount}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side: Search and filters */}
          <div className="flex items-center gap-1.5">
            <ButtonGroup className="w-[180px] focus-within:w-[240px] transition-[width] border-none duration-200 ease-out rounded-lg">
              <ButtonGroupText className="h-7 w-full rounded-lg px-2.5 gap-1.5 text-[13px] bg-accent/60 border border-transparent">
                <Search className="size-4" strokeWidth={2} color="var(--color-gray-alpha-600)" />
                <input
                  placeholder="Search responses..."
                  className="min-w-0 flex-1  bg-transparent border-0 p-0 outline-none text-[13px] placeholder:text-(--color-gray-alpha-600) placeholder:text-normal placeholder:text-[0.8rem]"
                  value={globalFilter}
                  onChange={handleGlobalFilterChange}
                  aria-label="Search responses"
                  name="search"
                />
              </ButtonGroupText>
            </ButtonGroup>
            {/* Column Visibility Toggle */}
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  prefix={
                    <Columns
                      className="size-4"
                      strokeWidth="2"
                      color="var(--color-gray-alpha-600)"
                    />
                  }
                  suffix={<ChevronDownIcon className="size-2.5 shrink-0 text-muted-foreground" />}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-accent/60 hover:bg-accent text-(--color-gray-alpha-600) transition-colors cursor-pointer text-normal text-[0.8rem] rounded-lg"
                >
                  Columns
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="sm"
              prefix={
                <Download strokeWidth={2} color="var(--color-gray-alpha-600)" className="size-4" />
              }
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-accent/60 hover:bg-accent text-(--color-gray-alpha-600) transition-colors cursor-pointer text-normal text-[0.8rem] rounded-lg"
              onClick={handleDownloadCSV}
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      {/* File preview dialog */}
      <Dialog open={previewFile !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 rounded-lg">
          {previewFile && (
            <>
              <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 rounded-md overflow-auto">
                {previewFile.type.startsWith("image/") ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : previewFile.type === "application/pdf" ? (
                  <iframe
                    src={previewFile.url}
                    title={previewFile.name}
                    className="w-full h-[70vh] border-0"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <FileTypeIcon type={previewFile.type} className="h-16 w-16" />
                    <p className="text-sm text-muted-foreground">
                      Preview not available for this file type.
                    </p>
                    <a
                      href={previewFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={previewFile.name}
                    >
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Table Container with DataGrid */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Floating Bulk Action Bar */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="fixed bottom-6 left-1/2  -translate-x-1/2 z-50 w-[min(560px,90vw)] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center justify-between  px-2.75 py-2.25 bg-background rounded-xl shadow-md">
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={true}
                  className="border-foreground data-[state=checked]:bg-foreground data-[state=checked]:border-foreground size-5"
                />
                <span className="text-sm">{Object.keys(rowSelection).length} selected</span>
              </div>
              <div className="flex items-center gap-1 h-6.5">
                <Button variant="ghost" size="sm" onClick={handleExportSelected}>
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <span className="text-xs text-muted-foreground ml-1">
                    {formatForDisplay(HOTKEYS.SUBMISSIONS_EXPORT)}
                  </span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBulkDelete}>
                  Delete
                  <span className="text-xs text-muted-foreground ml-1">
                    {formatForDisplay(HOTKEYS.SUBMISSIONS_DELETE)}
                  </span>
                </Button>
                <Button variant="secondary" size="sm" onClick={handleClearSelection}>
                  <XIcon className="h-3.5 w-3.5" />
                  Clear
                  <span className="text-xs text-muted-foreground ml-1">
                    {formatForDisplay(HOTKEYS.SUBMISSIONS_CLEAR_SELECTION)}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <DataGrid
          table={table}
          recordCount={totalCount}
          isLoading={isLoadingSubmissions}
          tableLayout={{
            dense: true,
            columnsResizable: true,
            columnsPinnable: false,
            columnsVisibility: true,
            columnsMovable: true,
            headerSticky: true,
            headerBackground: false,
            headerBorder: true,
            rowBorder: true,
          }}
          emptyMessage={
            <div className="flex flex-col items-center justify-center space-y-3 py-16 opacity-50">
              <div className="p-3 bg-muted rounded-full">
                <FilterIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-center">
                <p>No results found</p>
                <p className="text-xs text-muted-foreground">
                  {globalFilter
                    ? "Try adjusting your search query."
                    : "When people fill out your form, their responses will appear here."}
                </p>
              </div>
            </div>
          }
        >
          <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <DataGridContainer
              border={false}
              className="flex-1 min-h-0 border-b border-border overflow-x-auto overflow-y-hidden content-start"
            >
              <DataGridVirtualTable
                onFetchMore={fetchNextPage}
                hasMore={hasNextPage}
                isFetchingMore={isFetchingNextPage}
                fetchMoreOffset={5}
              />
            </DataGridContainer>
          </div>
        </DataGrid>
      </div>
    </div>
  );
};

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions",
)({
  component: SubmissionsPage,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["submissionsBootstrap", params.formId],
        queryFn: () => getSubmissionsBootstrap({ data: { formId: params.formId } }),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureInfiniteQueryData({
        queryKey: ["submissions", params.formId],
        queryFn: () => getPaginatedSubmissionsPage(params.formId, undefined),
        initialPageParam: undefined as SubmissionCursor | undefined,
        getNextPageParam: (lastPage: PaginatedSubmissionsPage) => lastPage.nextCursor,
      }),
    ]);
  },
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  pendingMs: 500,
  pendingMinMs: 300,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  ssr: "data-only",
});
