import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLatestPublishedVersion } from "@/lib/fn/form-versions";
import {
  deleteSubmission,
  deleteSubmissionsBulk,
  getSubmissionsByFormIdQueryOption,
  type SerializedSubmission,
} from "@/lib/fn/submissions";
import {
  getEditableFields,
  transformPlateStateToFormElements,
} from "@/lib/transform-plate-to-form";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnPinningState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/icons";
import { Circle, Columns } from "lucide-react";
import type { Value } from "platejs";
import { useCallback, useMemo, useRef, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { HOTKEYS, formatForDisplay } from "@/lib/hotkeys";
import { z } from "zod";

// Field status types for color coding
type FieldStatus = "current" | "deleted";

// Status colors and labels
const FIELD_STATUS_CONFIG: Record<
  FieldStatus,
  { color: string; bgColor: string; label: string; dotColor: string }
> = {
  current: {
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    label: "Current",
    dotColor: "fill-emerald-500",
  },
  deleted: {
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    label: "Deleted",
    dotColor: "fill-red-500",
  },
};

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions",
)({
  validateSearch: z.object({
    demo: z.boolean().optional(),
  }),
  component: SubmissionsPage,
  loader: async ({ context, params }) => {
    const [publishedData, submissionsData] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["publishedFormVersion", params.formId],
        queryFn: () =>
          getLatestPublishedVersion({ data: { formId: params.formId } }),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureQueryData({
        ...getSubmissionsByFormIdQueryOption(params.formId),
        revalidateIfStale: true,
      }),
    ]);
    return { publishedData, submissionsData };
  },
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function SubmissionsPage() {
  const { formId } = Route.useParams();
  const queryClient = useQueryClient();
  const {
    publishedData: initialPublishedData,
    submissionsData: initialSubmissionsData,
  } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "partial">(
    "all",
  );
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [fieldStatusFilter, setFieldStatusFilter] = useState<Set<FieldStatus>>(
    new Set(["current", "deleted"]),
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // 1. Fetch Published Form Structure (to derive columns from published version, not draft)
  const { data: publishedData } = useQuery({
    queryKey: ["publishedFormVersion", formId],
    queryFn: () => getLatestPublishedVersion({ data: { formId } }),
    initialData: initialPublishedData,
  });
  const publishedContent = publishedData?.form?.content;

  // 2. Fetch Submissions via server function
  const { data } = useQuery({
    ...getSubmissionsByFormIdQueryOption(formId),
    initialData: initialSubmissionsData,
  });

  // Client-side filter based on activeTab
  const allSubmissions: SerializedSubmission[] = data?.submissions ?? [];
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
        .filter(
          (field) =>
            field.fieldType === "Input" || field.fieldType === "Textarea",
        )
        .forEach((field) => currentFieldNames.add(field.name));
    }

    const orphaned = new Set<string>();
    allSubmissions.forEach((submission) => {
      if (submission.data && typeof submission.data === "object") {
        Object.keys(submission.data as Record<string, unknown>).forEach(
          (key) => {
            if (!currentFieldNames.has(key)) {
              orphaned.add(key);
            }
          },
        );
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
  const { columns, fieldCounts } = useMemo(() => {
    const columnHelper = createColumnHelper<any>();
    const counts: Record<FieldStatus, number> = { current: 0, deleted: 0 };

    // Select column for row selection - fixed width, non-resizable to prevent overlap with actions
    const baseColumns: ColumnDef<any, any>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
        enableSorting: false,
        enableHiding: false,
        enablePinning: false,
        enableResizing: false,
      },
      // Submission Date column - minSize prevents action buttons from truncating into select column
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Submitted at" />
        ),
        cell: (info) => (
          <div className="flex items-center justify-between gap-2 group/row min-w-0">
            <span className="text-[13px] truncate min-w-0">
              {format(new Date(info.getValue()), "MMM d, h:mm a")}
            </span>
            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(info.row.original.id);
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
    ];

    // Dynamic columns based on PUBLISHED form fields (current fields)
    if (formElements) {
      const editableFields = getEditableFields(formElements);

      // Only include Input and Textarea fields (not Button)
      const inputFields = editableFields.filter(
        (field) =>
          field.fieldType === "Input" || field.fieldType === "Textarea",
      );

      inputFields.forEach((field) => {
        const status: FieldStatus = "current";
        counts.current++;

        // Only add if status filter includes this status
        if (fieldStatusFilter.has(status)) {
          baseColumns.push(
            columnHelper.accessor((row) => row.data?.[field.name], {
              id: field.name,
              header: ({ column }) => (
                <DataGridColumnHeader
                  column={column}
                  title={field.label || field.name}
                  icon={
                    <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                  }
                />
              ),
              cell: (info) => (
                <span className="text-[13px] truncate max-w-[300px] block">
                  {info.getValue() || "-"}
                </span>
              ),
              size: 150,
              meta: {
                headerTitle: field.label || field.name,
              },
            }),
          );
        }
      });
    }

    // Add columns for orphaned fields (deleted from current version but have data)
    counts.deleted = orphanedFieldNames.size;
    orphanedFieldNames.forEach((fieldName) => {
      const status: FieldStatus = "deleted";

      // Only add if status filter includes this status
      if (fieldStatusFilter.has(status)) {
        baseColumns.push(
          columnHelper.accessor((row) => row.data?.[fieldName], {
            id: fieldName,
            header: ({ column }) => (
              <DataGridColumnHeader
                column={column}
                title={fieldName}
                icon={
                  <Circle className="h-1.5 w-1.5 fill-red-500 text-red-500" />
                }
              />
            ),
            cell: (info) => (
              <span className="text-[13px] truncate max-w-[300px] block text-muted-foreground">
                {info.getValue() || "-"}
              </span>
            ),
            size: 150,
            meta: {
              headerTitle: fieldName,
            },
          }),
        );
      }
    });

    return { columns: baseColumns, fieldCounts: counts };
  }, [formElements, orphanedFieldNames, fieldStatusFilter, handleDelete]);

  // Toggle field status filter
  const toggleFieldStatus = (status: FieldStatus) => {
    setFieldStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const table = useReactTable({
    data: submissions,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
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
    onSortingChange: setSorting as any,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
    (
      rows: typeof table extends { getRowModel: () => { rows: infer R } }
        ? R
        : never,
      filename: string,
    ) => {
      if ((rows as any[]).length === 0) return;

      const headers = columns
        .filter((col) => col.id !== "select")
        .map((col) => {
          if (typeof col.header === "string") return col.header;
          if (col.id === "submitted_at") return "Submitted At";
          return col.id || "Field";
        })
        .join(",");

      const csvRows = (rows as any[])
        .map((row) => {
          return row
            .getVisibleCells()
            .filter((cell: any) => cell.column.id !== "select")
            .map((cell: any) => {
              const val = cell.getValue();
              return `"${val ?? ""}"`;
            })
            .join(",");
        })
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
    downloadCSV(
      table.getSelectedRowModel().rows as any,
      `submissions-selected-${formId}.csv`,
    );
  }, [downloadCSV, formId, table]);

  const handleDownloadCSV = useCallback(() => {
    downloadCSV(table.getRowModel().rows as any, `submissions-${formId}.csv`);
  }, [downloadCSV, formId, table]);

  // Keyboard shortcuts (scoped to submissions page)
  const hasSelection = Object.keys(rowSelection).length > 0;

  useHotkey(
    HOTKEYS.SUBMISSIONS_SELECT_ALL,
    () => {
      table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());
    },
    { conflictBehavior: "replace" },
  );

  useHotkey(HOTKEYS.SUBMISSIONS_EXPORT, () => handleExportSelected(), {
    enabled: hasSelection,
    conflictBehavior: "replace",
  });

  useHotkey(HOTKEYS.SUBMISSIONS_DELETE, () => handleBulkDelete(), {
    enabled: hasSelection,
  });

  useHotkey(HOTKEYS.SUBMISSIONS_CLEAR_SELECTION, () => setRowSelection({}), {
    enabled: hasSelection,
  });

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background">
      {/* Filter Controls Row */}
      <div className="shrink-0 px-3 py-4  border-border">
        <div className="flex items-center justify-between">
          {/* Status filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px] font-medium bg-accent/60 hover:bg-accent"
                />
              }
            >
              {activeTab === "all"
                ? "All"
                : activeTab === "completed"
                  ? "Completed"
                  : "Partial"}
              <span className="opacity-60">
                {activeTab === "all"
                  ? allSubmissions.length
                  : activeTab === "completed"
                    ? completedCount
                    : partialCount}
              </span>
              <ChevronDownIcon
                className="h-2.5 w-2.5 shrink-0 text-muted-foreground transition-transform duration-200"
                strokeWidth="2"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem
                onClick={() => setActiveTab("all")}
                className="gap-2"
              >
                All
                <span className="ml-auto text-xs text-muted-foreground">
                  {allSubmissions.length}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("completed")}
                className="gap-2"
              >
                Completed
                <span className="ml-auto text-xs text-muted-foreground">
                  {completedCount}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("partial")}
                className="gap-2"
              >
                Partial
                <span className="ml-auto text-xs text-muted-foreground">
                  {partialCount}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side: Search and filters */}
          <div className="flex items-center gap-1.5">
            <ButtonGroup className="w-[180px] focus-within:w-[240px] transition-all">
              <ButtonGroupText className="h-7 w-full rounded-lg bg-accent/60 hover:bg-accent px-2 gap-1.5 ">
                <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <input
                  placeholder="Search responses..."
                  className="h-full min-w-0 flex-1 bg-transparent border-0 p-0 outline-none text-[13px] placeholder:text-muted-foreground/40"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </ButtonGroupText>
            </ButtonGroup>
            {/* Column Visibility Toggle */}
            <DataGridColumnVisibility
              table={table}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium bg-accent/60 hover:bg-accent text-foreground transition-colors cursor-pointer"
                >
                  <Columns className="h-3 w-3" />
                  Columns
                </button>
              }
            />

            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium bg-accent/60 hover:bg-accent text-foreground transition-colors cursor-pointer"
              onClick={handleDownloadCSV}
            >
              <DownloadIcon className="h-3 w-3" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Container with DataGrid */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Floating Bulk Action Bar */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(560px,90vw)] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center justify-between px-2.75 py-2.25 bg-background rounded-xl shadow-md">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={true}
                  className="border-foreground data-[state=checked]:bg-foreground data-[state=checked]:border-foreground size-5"
                />
                <span className="text-sm font-medium">
                  {Object.keys(rowSelection).length} selected
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRowSelection({})}
                >
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
          recordCount={allSubmissions.length}
          tableLayout={{
            dense: true,
            columnsResizable: true,
            columnsPinnable: true,
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
                <p className="font-medium">No results found</p>
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
              className="flex-1 min-h-0 border-b border-border overflow-auto content-start"
            >
              <DataGridTable />
            </DataGridContainer>

            {/* Custom Pagination - 20/50/80 style */}
            <div className="shrink-0 flex items-center justify-between px-2 py-0.75 -mt-px border-b border-border">
              {/* Left: Page size tabs */}
              <Tabs
                value={String(pagination.pageSize)}
                onValueChange={(value) => {
                  const size = Number(value);
                  if (Number.isNaN(size)) return;
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: size,
                    pageIndex: 0,
                  }));
                }}
                className="w-[108px] gap-0"
              >
                <TabsList className="relative grid w-full grid-cols-3 rounded-xl bg-muted/80 p-[2px] h-[30px] overflow-hidden">
                  <div
                    className="absolute top-[2px] bottom-[2px] rounded-[10px] bg-background/95 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.10)] dark:bg-background/70 dark:shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.06),0px_1px_2px_rgba(0,0,0,0.45)] z-0 transition-[left,width] duration-250 ease-in-out"
                    style={{
                      left: `calc(2px + ${[20, 50, 80].indexOf(pagination.pageSize)} * ((100% - 4px) / 3))`,
                      width: "calc((100% - 4px) / 3)",
                    }}
                  />
                  {[20, 50, 80].map((size) => (
                    <TabsTrigger
                      key={size}
                      value={String(size)}
                      className="relative z-10 h-[26px] w-full rounded-[10px] border-0 px-0 py-0 text-sm font-medium leading-none group-data-[variant=default]/tabs-list:data-active:shadow-none group-data-[variant=default]/tabs-list:data-active:bg-transparent group-data-[variant=default]/tabs-list:data-active:border-transparent data-active:text-foreground text-muted-foreground hover:text-foreground"
                    >
                      {size}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Right: Page info and navigation */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {table.getState().pagination.pageIndex * pagination.pageSize +
                    1}{" "}
                  -{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      pagination.pageSize,
                    table.getFilteredRowModel().rows.length,
                  )}{" "}
                  of {table.getFilteredRowModel().rows.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DataGrid>
      </div>
    </div>
  );
}
