import { Fragment } from "react";
import type { RefObject } from "react";
import { useDataGrid } from "@/components/ui/data-grid";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from "@/components/ui/data-grid-table";
import { Cell, flexRender, HeaderGroup, Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

const ESTIMATED_ROW_HEIGHT_DENSE = 37;
const ESTIMATED_ROW_HEIGHT_DEFAULT = 49;

function DataGridVirtualTable<TData>({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const { table, isLoading, props, isFetchingMore, fetchMoreSkeletonCount } = useDataGrid();
  const { rows } = table.getRowModel();

  const estimatedSize = props.tableLayout?.dense
    ? ESTIMATED_ROW_HEIGHT_DENSE
    : ESTIMATED_ROW_HEIGHT_DEFAULT;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => estimatedSize,
    getScrollElement: () => scrollRef.current,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>, index) => (
          <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
            {headerGroup.headers.map((header, hIndex) => {
              const { column } = header;
              return (
                <DataGridTableHeadRowCell header={header} key={hIndex}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {props.tableLayout?.columnsResizable && column.getCanResize() && (
                    <DataGridTableHeadRowCellResize header={header} />
                  )}
                </DataGridTableHeadRowCell>
              );
            })}
          </DataGridTableHeadRow>
        ))}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && <DataGridTableRowSpacer />}

      <DataGridTableBody>
        {isLoading && props.loadingMode === "skeleton" ? (
          Array.from({ length: 10 }).map((_, rowIndex) => (
            <DataGridTableBodyRowSkeleton key={rowIndex}>
              {table.getVisibleFlatColumns().map((column, colIndex) => (
                <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                  {column.columnDef.meta?.skeleton ?? (
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  )}
                </DataGridTableBodyRowSkeletonCell>
              ))}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : rows.length === 0 ? (
          <DataGridTableEmpty />
        ) : (
          <>
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  style={{
                    height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
                    padding: 0,
                    border: "none",
                  }}
                />
              </tr>
            )}

            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index] as Row<TData>;
              return (
                <Fragment key={row.id}>
                  <DataGridTableBodyRow
                    row={row}
                    data-index={virtualRow.index}
                    dndRef={(node) => rowVirtualizer.measureElement(node)}
                  >
                    {row.getVisibleCells().map((cell: Cell<TData, unknown>, colIndex) => (
                      <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </DataGridTableBodyRowCell>
                    ))}
                  </DataGridTableBodyRow>
                  {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
                </Fragment>
              );
            })}

            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  style={{
                    height:
                      rowVirtualizer.getTotalSize() -
                      (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                    padding: 0,
                    border: "none",
                  }}
                />
              </tr>
            )}

            {isFetchingMore &&
              Array.from({ length: fetchMoreSkeletonCount }).map((_, rowIndex) => (
                <DataGridTableBodyRowSkeleton key={`skeleton-${rowIndex}`}>
                  {table.getVisibleFlatColumns().map((column, colIndex) => (
                    <DataGridTableBodyRowSkeletonCell column={column} key={colIndex}>
                      {column.columnDef.meta?.skeleton ?? (
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      )}
                    </DataGridTableBodyRowSkeletonCell>
                  ))}
                </DataGridTableBodyRowSkeleton>
              ))}
          </>
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

export { DataGridVirtualTable };
