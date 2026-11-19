import React from 'react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
}

export function DataTable<T>({
  data = [],
  columns = [],
  keyExtractor,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const safeData = data || [];
  const safeColumns = columns || [];

  return (
    <div className="mausam-table-container w-full min-w-0">
      {/* Desktop / Tablet View: Tabular Layout */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="mausam-table">
          <thead>
            <tr>
              {safeColumns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeData.length === 0 ? (
              <tr>
                <td
                  colSpan={safeColumns.length || 1}
                  className="text-center py-6 text-[var(--m-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              safeData.map((row, idx) => (
                <tr key={keyExtractor(row, idx)}>
                  {safeColumns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : col.accessorKey
                        ? row[col.accessorKey] !== null && row[col.accessorKey] !== undefined
                          ? String(row[col.accessorKey])
                          : 'Not reported'
                        : 'Not reported'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Stacked Card Layout to Prevent Horizontal Scrolling */}
      <div className="md:hidden flex flex-col gap-3 w-full">
        {safeData.length === 0 ? (
          <div className="text-center py-6 text-[var(--m-text-muted)] bg-[var(--m-surface-2)] rounded-xl border border-[var(--m-border)] text-xs">
            {emptyMessage}
          </div>
        ) : (
          safeData.map((row, idx) => {
            const firstCol = safeColumns[0];
            const otherCols = safeColumns.slice(1);

            return (
              <div
                key={keyExtractor(row, idx)}
                className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl p-3.5 flex flex-col gap-2.5 text-xs"
              >
                {firstCol && (
                  <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2">
                    <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase tracking-wider">
                      {firstCol.header}
                    </span>
                    <div className="text-right font-mono tabular-nums text-[var(--m-text-primary)]">
                      {firstCol.render
                        ? firstCol.render(row, idx)
                        : firstCol.accessorKey
                        ? row[firstCol.accessorKey] !== null && row[firstCol.accessorKey] !== undefined
                          ? String(row[firstCol.accessorKey])
                          : 'Not reported'
                        : 'Not reported'}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {otherCols.map((col, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-[11px] font-semibold text-[var(--m-text-muted)] shrink-0">
                        {col.header}
                      </span>
                      <div className="text-right font-mono tabular-nums text-[var(--m-text-primary)]">
                        {col.render
                          ? col.render(row, idx)
                          : col.accessorKey
                          ? row[col.accessorKey] !== null && row[col.accessorKey] !== undefined
                            ? String(row[col.accessorKey])
                            : 'Not reported'
                          : 'Not reported'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
