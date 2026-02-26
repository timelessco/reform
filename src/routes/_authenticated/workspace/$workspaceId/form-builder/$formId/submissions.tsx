import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { CalendarIcon } from "@/components/ui/sidebar-icons";
import {
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns,
  Download,
  Filter,
  Maximize,
  Minus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Value } from "platejs";
import { useCallback, useMemo, useRef, useState } from "react";
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

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions",
)({
  validateSearch: z.object({
    sidebar: z.string().optional(),
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

  // 3. Derive stable orphaned field names from submissions
  // This prevents columns from rebuilding when submission data reference changes
  const orphanedFieldNamesRef = useRef<Set<string>>(new Set());
  const orphanedFieldNames = useMemo(() => {
    const currentFieldNames = new Set<string>();
    if (publishedContent) {
      const elements = transformPlateStateToFormElements(
        publishedContent as Value,
      );
      const editableFields = getEditableFields(elements);
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
  }, [allSubmissions, publishedContent]);

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
          <DataGridColumnHeader
            column={column}
            title="Submitted at"
            icon={<CalendarIcon className="h-3.5 w-3.5" />}
          />
        ),
        cell: (info) => (
          <div className="flex items-center justify-between gap-2 group/row min-w-0">
            <span className="text-sm truncate min-w-0">
              {format(new Date(info.getValue()), "MMM d, h:mm a")}
            </span>
            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
              >
                <Maximize className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(info.row.original.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
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
    if (publishedContent) {
      const elements = transformPlateStateToFormElements(
        publishedContent as Value,
      );
      const editableFields = getEditableFields(elements);

      // Only include Input and Textarea fields (not Button)
      const inputFields = editableFields.filter(
        (field) =>
          field.fieldType === "Input" || field.fieldType === "Textarea",
      );

      inputFields.forEach((field) => {
        const Icon = field.fieldType === "Input" ? Minus : AlignLeft;
        const status: FieldStatus = "current";
        counts.current++;

        // Only add if status filter includes this status
        if (fieldStatusFilter.has(status)) {
          const config = FIELD_STATUS_CONFIG[status];
          baseColumns.push(
            columnHelper.accessor((row) => row.data?.[field.name], {
              id: field.name,
              header: ({ column }) => (
                <DataGridColumnHeader
                  column={column}
                  title={field.label || field.name}
                  icon={
                    <div
                      className={cn("flex items-center gap-1.5", config.color)}
                    >
                      <Circle className={cn("h-2 w-2", config.dotColor)} />
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  }
                />
              ),
              cell: (info) => (
                <span className="text-sm truncate max-w-[300px] block">
                  {info.getValue() || "-"}
                </span>
              ),
              size: 150,
              meta: {
                headerClassName: config.bgColor,
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
        const config = FIELD_STATUS_CONFIG[status];
        baseColumns.push(
          columnHelper.accessor((row) => row.data?.[fieldName], {
            id: fieldName,
            header: ({ column }) => (
              <DataGridColumnHeader
                column={column}
                title={fieldName}
                icon={
                  <div
                    className={cn("flex items-center gap-1.5", config.color)}
                  >
                    <Circle className={cn("h-2 w-2", config.dotColor)} />
                    <Minus className="h-3.5 w-3.5" />
                  </div>
                }
              />
            ),
            cell: (info) => (
              <span className="text-sm truncate max-w-[300px] block text-muted-foreground italic">
                {info.getValue() || "-"}
              </span>
            ),
            size: 150,
            meta: {
              headerClassName: config.bgColor,
            },
          }),
        );
      }
    });

    return { columns: baseColumns, fieldCounts: counts };
  }, [publishedContent, orphanedFieldNames, fieldStatusFilter, handleDelete]);

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

  // Export selected rows as CSV
  const handleExportSelected = useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const headers = columns
      .filter((col) => col.id !== "select")
      .map((col) => {
        if (typeof col.header === "string") return col.header;
        if (col.id === "submitted_at") return "Submitted At";
        return col.id || "Field";
      })
      .join(",");

    const rows = selectedRows
      .map((row) => {
        return row
          .getVisibleCells()
          .filter((cell) => cell.column.id !== "select")
          .map((cell) => {
            const val = cell.getValue();
            return `"${val ?? ""}"`;
          })
          .join(",");
      })
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `submissions-selected-${formId}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [columns, formId, table]);

  const handleDownloadCSV = () => {
    const headers = columns
      .filter((col) => col.id !== "select")
      .map((col) => {
        if (typeof col.header === "string") return col.header;
        if (col.id === "submitted_at") return "Submitted At";
        return col.id || "Field";
      })
      .join(",");

    const rows = table
      .getRowModel()
      .rows.map((row) => {
        return row
          .getVisibleCells()
          .filter((cell) => cell.column.id !== "select")
          .map((cell) => {
            const val = cell.getValue();
            return `"${val ?? ""}"`;
          })
          .join(",");
      })
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `submissions-${formId}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background">
      {/* Filter Controls Row */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          {/* Status filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px] font-medium"
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
                    ? allSubmissions.filter(
                        (s: SerializedSubmission) => s.isCompleted,
                      ).length
                    : allSubmissions.filter(
                        (s: SerializedSubmission) => !s.isCompleted,
                      ).length}
              </span>
              <ChevronDown className="h-3 w-3 ml-1" />
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
                  {
                    allSubmissions.filter(
                      (s: SerializedSubmission) => s.isCompleted,
                    ).length
                  }
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("partial")}
                className="gap-2"
              >
                Partial
                <span className="ml-auto text-xs text-muted-foreground">
                  {
                    allSubmissions.filter(
                      (s: SerializedSubmission) => !s.isCompleted,
                    ).length
                  }
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side: Search and filters */}
          <div className="flex items-center gap-3">
            <div className="relative group/s">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within/s:text-foreground transition-colors" />
              <input
                placeholder="Search responses..."
                className="pl-6 bg-transparent outline-none text-[13px] w-[180px] focus:w-[240px] transition-all placeholder:text-muted-foreground/40"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>

            {/* Field Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-[11px] font-medium"
                  />
                }
              >
                <Filter className="h-3 w-3" />
                Fields
                {fieldStatusFilter.size < 2 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px]">
                    {fieldStatusFilter.size}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Filter by field status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(FIELD_STATUS_CONFIG) as FieldStatus[]).map(
                  (status) => {
                    const config = FIELD_STATUS_CONFIG[status];
                    return (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={fieldStatusFilter.has(status)}
                        onCheckedChange={() => toggleFieldStatus(status)}
                        className="gap-2"
                      >
                        <Circle className={cn("h-2 w-2", config.dotColor)} />
                        <span>{config.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {fieldCounts[status]}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  },
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Visibility Toggle */}
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px] font-medium"
                >
                  <Columns className="h-3 w-3" />
                  Columns
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-muted-foreground hover:text-foreground text-[11px] font-semibold uppercase tracking-tight"
              onClick={handleDownloadCSV}
            >
              <Download className="h-3 w-3" />
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table Container with DataGrid */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-2">
        {/* Bulk Action Toolbar */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="mb-3 flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <Checkbox checked={true} className="border-primary" />
              <span className="text-sm font-medium">
                {Object.keys(rowSelection).length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        <DataGrid
          table={table}
          recordCount={allSubmissions.length}
          tableLayout={{
            columnsResizable: true,
            columnsPinnable: true,
            columnsVisibility: true,
            columnsMovable: true,
            headerSticky: true,
            rowBorder: true,
          }}
          emptyMessage={
            <div className="flex flex-col items-center justify-center space-y-3 py-16 opacity-50">
              <div className="p-3 bg-muted rounded-full">
                <Filter className="h-6 w-6" />
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
              className="flex-1 min-h-0 border-y border-border overflow-auto content-start"
            >
              <DataGridTable />
            </DataGridContainer>

            {/* Custom Pagination - 20/50/80 style */}
            <div className="shrink-0 flex items-center justify-between px-2 py-2 border-b border-border">
              {/* Left: Page size buttons */}
              <div className="flex items-center gap-1">
                {[20, 50, 80].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      pagination.pageSize === size
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageSize: size,
                        pageIndex: 0,
                      }))
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>

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
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
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
