import type { Key, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { cx } from './ui';

export interface EventTableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface EventTableProps<Row> {
  title: string;
  subtitle?: string;
  rows: Row[];
  columns: EventTableColumn<Row>[];
  rowKey: (row: Row) => Key;
  emptyText?: string;
  toolbar?: ReactNode;
  renderAction?: (row: Row) => ReactNode;
  caption?: ReactNode;
}

export function EventTable<Row>({
  title,
  subtitle,
  rows,
  columns,
  rowKey,
  emptyText = 'Chưa có dữ liệu.',
  toolbar,
  renderAction,
  caption,
}: EventTableProps<Row>) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/60 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {toolbar}
          <span className="rounded-full bg-slate-900/5 px-3 py-1 text-sm text-slate-500 ring-1 ring-slate-900/5">{rows.length} bản ghi</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-900/[0.03] text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={cx('px-5 py-4 font-medium', column.headerClassName)}>
                    {column.header}
                  </th>
                ))}
                {renderAction ? <th className="px-5 py-4 text-right font-medium">Hành động</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white/30">
              {rows.map((row) => (
                <tr key={rowKey(row)} className="align-top transition-colors hover:bg-white/75">
                  {columns.map((column) => (
                    <td key={column.key} className={cx('px-5 py-4 text-sm text-slate-700', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                  {renderAction ? (
                    <td className="px-5 py-4 text-right text-sm">
                      <div className="inline-flex items-center gap-2">{renderAction(row)}</div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {caption ? (
        <div className="flex items-center gap-2 border-t border-white/60 px-5 py-4 text-xs text-slate-500">
          <ChevronRight size={14} className="text-slate-400" />
          {caption}
        </div>
      ) : null}
    </section>
  );
}
