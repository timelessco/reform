import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { submissionCollection } from "@/db-collections/submission.collections";
import { useForm } from "@/hooks/use-live-hooks";
import { cn } from "@/lib/utils";
import {
    getEditableFields,
    transformPlateStateToFormElements,
} from "@/lib/transform-plate-to-form";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import type { Value } from "platejs";
import {
    AlignLeft,
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Maximize,
    Minus,
    Search,
    Trash2
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute(
    "/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions",
)({
    component: SubmissionsPage,
});

function SubmissionsPage() {
    const { formId } = Route.useParams();
    const [activeTab, setActiveTab] = useState<"all" | "completed" | "partial">("all");
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");

    // 1. Fetch Form Structure (to derive columns)
    const savedDocs = useForm(formId);
    const doc = savedDocs?.[0];

    // 2. Fetch Submissions
    const { data: submissions = [] } = useLiveQuery((q) => {
        let query = q.from({ s: submissionCollection }).where(({ s }) => eq(s.formId, formId));

        if (activeTab === "completed") {
            query = query.where(({ s }) => eq(s.isCompleted, true));
        } else if (activeTab === "partial") {
            query = query.where(({ s }) => eq(s.isCompleted, false));
        }

        return query;
    });

    // 3. Derive Columns from Form Content using the same transform as form preview
    const columns = useMemo(() => {
        const columnHelper = createColumnHelper<any>();

        // Fixed first column: Submission Date
        const baseColumns: ColumnDef<any, any>[] = [
            columnHelper.accessor("createdAt", {
                header: ({ column }) => (
                    <div className="flex items-center gap-2 cursor-pointer select-none group/h" onClick={() => column.toggleSorting()}>
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Submitted at</span>
                        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/h:opacity-100 transition-opacity" />
                    </div>
                ),
                cell: (info) => (
                    <div className="flex items-center justify-between group">
                        <span className="text-sm">{format(new Date(info.getValue()), "MMM d, h:mm a")}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-4">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <Maximize className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ),
                id: "submitted_at"
            }),
        ];

        // Dynamic columns based on form fields - use same transform as form preview
        if (doc?.content) {
            const elements = transformPlateStateToFormElements(doc.content as Value);
            const editableFields = getEditableFields(elements);

            // Only include Input and Textarea fields (not Button)
            const inputFields = editableFields.filter(
                (field) => field.fieldType === "Input" || field.fieldType === "Textarea"
            );

            inputFields.forEach((field) => {
                const Icon = field.fieldType === "Input" ? Minus : AlignLeft;

                baseColumns.push(
                    columnHelper.accessor((row) => row.data?.[field.name], {
                        id: field.name,
                        header: () => (
                            <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    {field.label || field.name}
                                </span>
                            </div>
                        ),
                        cell: (info) => (
                            <span className="text-sm truncate max-w-[300px] block py-1">
                                {info.getValue() || "-"}
                            </span>
                        ),
                    })
                );
            });
        }

        return baseColumns;
    }, [doc]);

    const table = useReactTable({
        data: submissions,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting as any,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleDownloadCSV = () => {
        const headers = columns.map(col => {
            if (typeof col.header === 'string') return col.header;
            if (col.id === 'submitted_at') return 'Submitted At';
            return col.id || 'Field';
        }).join(",");

        const rows = table.getRowModel().rows.map(row => {
            return row.getVisibleCells().map(cell => {
                const val = cell.getValue();
                return `"${val ?? ""}"`;
            }).join(",");
        }).join("\n");

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
        <div className="flex flex-col h-full bg-background">
            {/* Filter Controls Row */}
            <div className="px-12 pt-8 pb-4">
                <div className="flex items-center justify-between border-b pb-1">
                    <div className="flex items-center gap-6 text-[13px]">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={cn(
                                "pb-3 transition-colors relative",
                                activeTab === "all" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            All <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">{submissions.length}</span>
                            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
                        </button>
                        <button
                            onClick={() => setActiveTab("completed")}
                            className={cn(
                                "pb-3 transition-colors relative",
                                activeTab === "completed" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Completed <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">{submissions.filter(s => s.isCompleted).length}</span>
                            {activeTab === "completed" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
                        </button>
                        <button
                            onClick={() => setActiveTab("partial")}
                            className={cn(
                                "pb-3 transition-colors relative",
                                activeTab === "partial" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Partial <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">{submissions.filter(s => !s.isCompleted).length}</span>
                            {activeTab === "partial" && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-6 pb-3">
                        <div className="relative group/s">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within/s:text-foreground transition-colors" />
                            <input
                                placeholder="Search responses..."
                                className="pl-6 bg-transparent outline-none text-[13px] w-[180px] focus:w-[240px] transition-all placeholder:text-muted-foreground/40"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 gap-1.5 text-muted-foreground hover:text-foreground text-[11px] font-semibold uppercase tracking-tight" onClick={handleDownloadCSV}>
                            <Download className="h-3 w-3" />
                            Download CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto px-12 pb-12">


                <div className="overflow-auto border rounded-xl bg-background shadow-sm">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-11 py-0">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="group transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-72 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                                            <div className="p-3 bg-muted rounded-full">
                                                <Filter className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium">No results found</p>
                                                <p className="text-xs">
                                                    {globalFilter
                                                        ? "Try adjusting your search query."
                                                        : "When people fill out your form, their responses will appear here."}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                    <div className="text-xs text-muted-foreground">
                        Showing {table.getRowModel().rows.length} of {submissions.length} results
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </span>
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
    );
}
