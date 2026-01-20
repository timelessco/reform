import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type ColumnDef,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    ArrowUpDown,
    MoreHorizontal,
    Calendar
} from "lucide-react";
import { useForm } from "@/hooks/use-live-hooks";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { submissionCollection } from "@/db-collections";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

    // 3. Derive Columns from Form Content
    const columns = useMemo(() => {
        const columnHelper = createColumnHelper<any>();

        // Fixed first column: Submission Date
        const baseColumns: ColumnDef<any, any>[] = [
            columnHelper.accessor("createdAt", {
                header: ({ column }) => (
                    <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
                        <Calendar className="h-3 w-3" />
                        <span>Submitted at</span>
                        <ArrowUpDown className="h-3 w-3" />
                    </div>
                ),
                cell: (info) => format(new Date(info.getValue()), "MMM d, h:mm a"),
            }),
        ];

        // Dynamic columns based on form fields
        // We look for elements with 'label' in form content
        if (doc?.content) {
            const fields = (doc.content as any[]).filter(
                (node) => node.type === "form_input" || node.type === "form_textarea"
            );

            fields.forEach((field, index) => {
                const label = field.children?.[0]?.text || `Field ${index + 1}`;
                const fieldId = field.id || label;

                baseColumns.push(
                    columnHelper.accessor((row) => row.data[fieldId] || row.data[label], {
                        id: fieldId,
                        header: label,
                        cell: (info) => (
                            <span className="text-muted-foreground truncate max-w-[200px] block">
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
        // Mock implementation
        const headers = columns.map(col => typeof col.header === 'string' ? col.header : col.id).join(",");
        const rows = submissions.map(sub => {
            return columns.map(col => {
                const val = typeof col.accessorFn === 'function' ? col.accessorFn(sub, 0) : "";
                return `"${val}"`;
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
        <div className="p-6 space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
                    <div className="flex items-center gap-4 text-sm">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={cn(
                                "pb-1 border-b-2 transition-colors",
                                activeTab === "all" ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            All <span className="text-xs ml-1 opacity-70">{submissions.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("completed")}
                            className={cn(
                                "pb-1 border-b-2 transition-colors",
                                activeTab === "completed" ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Completed <span className="text-xs ml-1 opacity-70">{submissions.filter(s => s.isCompleted).length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("partial")}
                            className={cn(
                                "pb-1 border-b-2 transition-colors",
                                activeTab === "partial" ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Partial <span className="text-xs ml-1 opacity-70">{submissions.filter(s => !s.isCompleted).length}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search responses..."
                            className="pl-9 w-[250px] h-9"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleDownloadCSV}>
                        <Download className="h-4 w-4" />
                        <span>Download CSV</span>
                    </Button>
                </div>
            </div>

            <div className="border rounded-xl bg-background overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 py-0">
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
