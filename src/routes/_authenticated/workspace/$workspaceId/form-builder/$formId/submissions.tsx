import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	AlignLeft,
	ArrowUpDown,
	Calendar,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Circle,
	Download,
	Filter,
	Maximize,
	Minus,
	Search,
	Trash2,
} from "lucide-react";
import type { Value } from "platejs";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getLatestPublishedVersion } from "@/lib/fn/form-versions";
import {
	deleteSubmission,
	getSubmissionsByFormIdQueryOption,
	type SerializedSubmission,
} from "@/lib/fn/submissions";
import {
	getEditableFields,
	transformPlateStateToFormElements,
} from "@/lib/transform-plate-to-form";
import { cn } from "@/lib/utils";

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
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
	const [fieldStatusFilter, setFieldStatusFilter] = useState<Set<FieldStatus>>(
		new Set(["current", "deleted"]),
	);

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

	// Delete handler
	const handleDelete = async (submissionId: string) => {
		await deleteSubmission({ data: { id: submissionId, formId } });
		queryClient.invalidateQueries({ queryKey: ["submissions", formId] });
	};

	// 3. Derive Columns from PUBLISHED Form Content (not draft)
	// Also collect any orphaned field names from submissions (for deleted fields)
	// Track field counts by status for the filter badge
	const { columns, fieldCounts } = useMemo(() => {
		const columnHelper = createColumnHelper<any>();
		const counts: Record<FieldStatus, number> = { current: 0, deleted: 0 };

		// Fixed first column: Submission Date
		const baseColumns: ColumnDef<any, any>[] = [
			columnHelper.accessor("createdAt", {
				header: ({ column }) => (
					<div
						className="flex items-center gap-2 cursor-pointer select-none group/h"
						onClick={() => column.toggleSorting()}
					>
						<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
						<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
							Submitted at
						</span>
						<ArrowUpDown className="h-3 w-3 opacity-0 group-hover/h:opacity-100 transition-opacity" />
					</div>
				),
				cell: (info) => (
					<div className="flex items-center justify-between group">
						<span className="text-sm">
							{format(new Date(info.getValue()), "MMM d, h:mm a")}
						</span>
						<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-4">
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground"
							>
								<Maximize className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-muted-foreground hover:text-destructive"
								onClick={() => handleDelete(info.row.original.id)}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				),
				id: "submitted_at",
				meta: { status: null }, // System column, no status
			}),
		];

		// Track field names we've added columns for
		const addedFieldNames = new Set<string>();

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
				addedFieldNames.add(field.name);
				counts.current++;

				// Only add if status filter includes this status
				if (fieldStatusFilter.has(status)) {
					const config = FIELD_STATUS_CONFIG[status];
					baseColumns.push(
						columnHelper.accessor((row) => row.data?.[field.name], {
							id: field.name,
							header: () => (
								<div
									className={cn(
										"flex items-center gap-2 px-2 py-1 rounded-md -mx-2",
										config.bgColor,
									)}
								>
									<Circle className={cn("h-2 w-2", config.dotColor)} />
									<Icon className={cn("h-3.5 w-3.5", config.color)} />
									<span
										className={cn(
											"text-[11px] font-bold uppercase tracking-wider",
											config.color,
										)}
									>
										{field.label || field.name}
									</span>
								</div>
							),
							cell: (info) => (
								<span className="text-sm truncate max-w-[300px] block py-1">
									{info.getValue() || "-"}
								</span>
							),
							meta: { status },
						}),
					);
				}
			});
		}

		// Collect orphaned field names from submission data (fields that existed in old versions but were deleted)
		const orphanedFields = new Set<string>();
		allSubmissions.forEach((submission) => {
			if (submission.data && typeof submission.data === "object") {
				Object.keys(submission.data as Record<string, unknown>).forEach(
					(key) => {
						if (!addedFieldNames.has(key)) {
							orphanedFields.add(key);
						}
					},
				);
			}
		});

		// Add columns for orphaned fields (deleted from current version but have data)
		orphanedFields.forEach((fieldName) => {
			const status: FieldStatus = "deleted";
			counts.deleted++;

			// Only add if status filter includes this status
			if (fieldStatusFilter.has(status)) {
				const config = FIELD_STATUS_CONFIG[status];
				baseColumns.push(
					columnHelper.accessor((row) => row.data?.[fieldName], {
						id: fieldName,
						header: () => (
							<div
								className={cn(
									"flex items-center gap-2 px-2 py-1 rounded-md -mx-2",
									config.bgColor,
								)}
							>
								<Circle className={cn("h-2 w-2", config.dotColor)} />
								<Minus className={cn("h-3.5 w-3.5", config.color)} />
								<span
									className={cn(
										"text-[11px] font-bold uppercase tracking-wider italic",
										config.color,
									)}
								>
									{fieldName}
								</span>
							</div>
						),
						cell: (info) => (
							<span className="text-sm truncate max-w-[300px] block py-1 text-muted-foreground">
								{info.getValue() || "-"}
							</span>
						),
						meta: { status },
					}),
				);
			}
		});

		return { columns: baseColumns, fieldCounts: counts };
	}, [publishedContent, allSubmissions, fieldStatusFilter, handleDelete]);

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
		},
		onSortingChange: setSorting as any,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const handleDownloadCSV = () => {
		const headers = columns
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
			<div className="shrink-0 px-12 pt-8 pb-4">
				<div className="flex items-center justify-between border-b pb-1">
					<div className="flex items-center gap-6 text-[13px]">
						<button
							onClick={() => setActiveTab("all")}
							className={cn(
								"pb-3 transition-colors relative",
								activeTab === "all"
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							All{" "}
							<span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">
								{allSubmissions.length}
							</span>
							{activeTab === "all" && (
								<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
							)}
						</button>
						<button
							onClick={() => setActiveTab("completed")}
							className={cn(
								"pb-3 transition-colors relative",
								activeTab === "completed"
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Completed{" "}
							<span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">
								{
									allSubmissions.filter(
										(s: SerializedSubmission) => s.isCompleted,
									).length
								}
							</span>
							{activeTab === "completed" && (
								<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
							)}
						</button>
						<button
							onClick={() => setActiveTab("partial")}
							className={cn(
								"pb-3 transition-colors relative",
								activeTab === "partial"
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Partial{" "}
							<span className="ml-1 text-[11px] px-1.5 py-0.5 bg-muted rounded-full font-normal">
								{
									allSubmissions.filter(
										(s: SerializedSubmission) => !s.isCompleted,
									).length
								}
							</span>
							{activeTab === "partial" && (
								<div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
							)}
						</button>
					</div>

					<div className="flex items-center gap-4 pb-3">
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
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-7 gap-1.5 text-[11px] font-medium"
								>
									<Filter className="h-3 w-3" />
									Fields
									{fieldStatusFilter.size < 2 && (
										<span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px]">
											{fieldStatusFilter.size}
										</span>
									)}
									<ChevronDown className="h-3 w-3 ml-1" />
								</Button>
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

			{/* Table Container - scrollable table, fixed pagination */}
			<div className="flex-1 flex flex-col min-h-0 min-w-0 px-12 pb-4">
				<div className="flex-1 min-w-0 overflow-auto border rounded-xl bg-background shadow-sm min-h-0">
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
														header.getContext(),
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
											<TableCell key={cell.id} className="py-3.5">
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
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

				{/* Pagination - fixed at bottom */}
				<div className="flex items-center justify-between px-4 py-3 mt-3 border rounded-lg bg-muted/10">
					<div className="text-xs text-muted-foreground">
						Showing {table.getRowModel().rows.length} of {allSubmissions.length}{" "}
						results
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
							{table.getPageCount() || 1}
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
