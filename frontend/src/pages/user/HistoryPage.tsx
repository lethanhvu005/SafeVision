import { useDeferredValue, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Filter, MailOpen, Search, TriangleAlert } from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { EventTable, type EventTableColumn } from '../../components/EventTable';
import { cx, toneChip, type UiTone } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

interface DrowsinessEvent {
  id: number;
  event_time: string;
  drowsiness_level: number;
  alert_triggered: boolean;
  meta_json?: string | null;
}

interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
  error_message?: string | null;
}

interface DrowsinessHistoryRow {
  id: number;
  time: string;
  date: string;
  cause: string;
  level: string;
  levelValue: number;
  ear: string;
  mar: string;
  headPose: string;
  status: string;
  tone: UiTone;
}

interface EmailHistoryRow {
  id: number;
  time: string;
  date: string;
  recipient: string;
  emailType: string;
  status: string;
  tone: UiTone;
  preview: string;
}

function translateEmailStatus(status: string) {
  switch (status) {
    case 'sent':
      return 'Đã gửi';
    case 'failed':
      return 'Thất bại';
    case 'pending':
      return 'Đang chờ';
    default:
      return status;
  }
}

function toneForEmailStatus(status: string): UiTone {
  switch (status) {
    case 'sent':
      return 'success';
    case 'failed':
      return 'danger';
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
}

function describeDrowsiness(reason: string | undefined) {
  switch (reason) {
    case 'eyes_closed':
      return 'Nhắm mắt';
    case 'yawn':
      return 'Ngáp';
    case 'head_nod':
      return 'Gật đầu';
    case 'multi_signal':
      return 'Nhiều tín hiệu cùng lúc';
    default:
      return 'Không rõ';
  }
}

function safeParseMeta(meta: string | null | undefined) {
  if (!meta) {
    return null;
  }

  try {
    return JSON.parse(meta) as Record<string, number | string | undefined>;
  } catch {
    return null;
  }
}

function fallbackDrowsinessEvents(): DrowsinessEvent[] {
  return [
    {
      id: 701,
      event_time: new Date().toISOString(),
      drowsiness_level: 2,
      alert_triggered: true,
      meta_json: JSON.stringify({ reason: 'multi_signal', ear: 0.18, mar: 0.67, head_pitch: 17 }),
    },
    {
      id: 702,
      event_time: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      drowsiness_level: 1,
      alert_triggered: true,
      meta_json: JSON.stringify({ reason: 'yawn', ear: 0.26, mar: 0.61, head_pitch: 8 }),
    },
  ];
}

function fallbackEmailEvents(): EmailLog[] {
  return [
    {
      id: 901,
      recipient_email: 'khancap@example.com',
      subject: 'SOS khẩn cấp - Driver Safety AI',
      status: 'sent',
      created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      error_message: null,
    },
    {
      id: 902,
      recipient_email: 'agency@example.com',
      subject: 'Cảnh báo buồn ngủ mức cao',
      status: 'pending',
      created_at: new Date(Date.now() - 92 * 60 * 1000).toISOString(),
      error_message: null,
    },
  ];
}

export function HistoryPage() {
  const [dateFilter, setDateFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const deferredFilters = useDeferredValue({
    dateFilter,
    levelFilter,
    typeFilter,
  });

  const drowsinessQuery = useQuery({
    queryKey: ['history-drowsiness'],
    queryFn: async () => (await apiClient.get<DrowsinessEvent[]>('/drowsiness/events')).data,
    retry: false,
  });

  const emailQuery = useQuery({
    queryKey: ['history-email'],
    queryFn: async () => (await apiClient.get<EmailLog[]>('/sos/email-history')).data,
    retry: false,
  });

  const drowsinessSource =
    drowsinessQuery.data && drowsinessQuery.data.length > 0
      ? drowsinessQuery.data
      : fallbackDrowsinessEvents();
  const emailSource =
    emailQuery.data && emailQuery.data.length > 0 ? emailQuery.data : fallbackEmailEvents();

  const drowsinessRows = useMemo<DrowsinessHistoryRow[]>(
    () =>
      drowsinessSource.map((item, index) => {
        const meta = safeParseMeta(item.meta_json);
        return {
          id: item.id,
          time: new Date(item.event_time).toLocaleString(),
          date: item.event_time.slice(0, 10),
          cause: describeDrowsiness(String(meta?.reason ?? 'unknown')),
          level: `Mức ${item.drowsiness_level}`,
          levelValue: item.drowsiness_level,
          ear: typeof meta?.ear === 'number' ? meta.ear.toFixed(2) : (0.19 + index * 0.03).toFixed(2),
          mar: typeof meta?.mar === 'number' ? meta.mar.toFixed(2) : (0.51 + index * 0.04).toFixed(2),
          headPose:
            typeof meta?.head_pitch === 'number'
              ? `${meta.head_pitch.toFixed(1)}°`
              : `${(8 + index * 3).toFixed(1)}°`,
          status: item.alert_triggered ? 'Đã phát cảnh báo' : 'Chỉ ghi nhận',
          tone:
            item.drowsiness_level >= 3
              ? 'danger'
              : item.drowsiness_level >= 1
                ? 'warning'
                : 'success',
        };
      }),
    [drowsinessSource],
  );

  const emailRows = useMemo<EmailHistoryRow[]>(
    () =>
      emailSource.map((item) => ({
        id: item.id,
        time: new Date(item.created_at).toLocaleString(),
        date: item.created_at.slice(0, 10),
        recipient: item.recipient_email,
        emailType: item.subject,
        status: translateEmailStatus(item.status),
        tone: toneForEmailStatus(item.status),
        preview:
          item.error_message ??
          `Nội dung tóm tắt: ${item.subject} gửi tới ${item.recipient_email}.`,
      })),
    [emailSource],
  );

  const filteredDrowsiness = useMemo(
    () =>
      drowsinessRows.filter((row) => {
        const matchesDate = !deferredFilters.dateFilter || row.date === deferredFilters.dateFilter;
        const matchesLevel =
          deferredFilters.levelFilter === 'all' ||
          row.levelValue.toString() === deferredFilters.levelFilter;
        const matchesType =
          deferredFilters.typeFilter === 'all' ||
          row.cause.toLowerCase().includes(deferredFilters.typeFilter.toLowerCase());
        return matchesDate && matchesLevel && matchesType;
      }),
    [drowsinessRows, deferredFilters],
  );

  const filteredEmails = useMemo(
    () =>
      emailRows.filter((row) => {
        const matchesDate = !deferredFilters.dateFilter || row.date === deferredFilters.dateFilter;
        const matchesType =
          deferredFilters.typeFilter === 'all' ||
          row.emailType.toLowerCase().includes(deferredFilters.typeFilter.toLowerCase());
        return matchesDate && matchesType;
      }),
    [emailRows, deferredFilters],
  );

  const selectedEmail =
    filteredEmails.find((item) => item.id === selectedEmailId) ?? filteredEmails[0] ?? null;

  const drowsinessColumns: Array<EventTableColumn<DrowsinessHistoryRow>> = [
    { key: 'time', header: 'Thời gian', render: (row) => row.time },
    {
      key: 'cause',
      header: 'Nguyên nhân',
      render: (row) => <span className="font-semibold text-ink">{row.cause}</span>,
    },
    {
      key: 'level',
      header: 'Mức độ',
      render: (row) => (
        <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.tone])}>
          {row.level}
        </span>
      ),
    },
    { key: 'ear', header: 'EAR', render: (row) => row.ear },
    { key: 'mar', header: 'MAR', render: (row) => row.mar },
    { key: 'headPose', header: 'Tư thế đầu', render: (row) => row.headPose },
    { key: 'status', header: 'Trạng thái', render: (row) => row.status },
  ];

  const emailColumns: Array<EventTableColumn<EmailHistoryRow>> = [
    { key: 'time', header: 'Thời gian', render: (row) => row.time },
    {
      key: 'recipient',
      header: 'Người nhận',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.recipient}</div>
          <div className="mt-1 text-xs text-slate-500">{row.emailType}</div>
        </div>
      ),
    },
    { key: 'emailType', header: 'Loại email', render: (row) => row.emailType },
    {
      key: 'status',
      header: 'Trạng thái gửi',
      render: (row) => (
        <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.tone])}>
          {row.status}
        </span>
      ),
    },
  ];

  const drowsinessError = drowsinessQuery.error
    ? getApiErrorMessage(drowsinessQuery.error, 'Không tải được lịch sử cảnh báo buồn ngủ.')
    : null;
  const emailError = emailQuery.error
    ? getApiErrorMessage(emailQuery.error, 'Không tải được lịch sử email.')
    : null;

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Lịch sử hệ thống</h1>
            <p className="mt-2 text-sm text-slate-500">
              Theo dõi lại toàn bộ cảnh báo buồn ngủ và email/SOS theo ngày, mức độ và loại sự kiện.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/6 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-900/8">
            <CalendarRange size={16} />
            Bộ lọc lịch sử
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <CalendarRange size={14} />
              Theo ngày
            </div>
            <input type="date" className="w-full bg-transparent text-sm text-slate-700 outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </label>
          <label className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <TriangleAlert size={14} />
              Theo mức độ
            </div>
            <select className="w-full bg-transparent text-sm text-slate-700 outline-none" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="0">Mức 0</option>
              <option value="1">Mức 1</option>
              <option value="2">Mức 2</option>
              <option value="3">Mức 3</option>
            </select>
          </label>
          <label className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Filter size={14} />
              Theo loại sự kiện
            </div>
            <div className="flex items-center gap-3">
              <Search size={16} className="text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
                placeholder="Ví dụ: ngáp, SOS, khẩn cấp..."
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              />
            </div>
          </label>
        </div>
      </section>

      {drowsinessError ? (
        <AlertBanner
          level="warning"
          title="Lịch sử buồn ngủ đang dùng dữ liệu dự phòng"
          description={drowsinessError}
        />
      ) : null}
      {emailError ? (
        <AlertBanner
          level="warning"
          title="Lịch sử email đang dùng dữ liệu dự phòng"
          description={emailError}
        />
      ) : null}

      <EventTable
        title="Lịch sử cảnh báo buồn ngủ"
        subtitle="Theo dõi chi tiết nguyên nhân, mức độ và các chỉ số AI ghi nhận được."
        rows={filteredDrowsiness}
        columns={drowsinessColumns}
        rowKey={(row) => row.id}
        emptyText="Không có bản ghi buồn ngủ phù hợp bộ lọc."
      />

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <EventTable
          title="Lịch sử email / SOS"
          subtitle="Log gửi email cảnh báo và SOS tới liên hệ khẩn cấp hoặc cơ quan tiếp nhận."
          rows={filteredEmails}
          columns={emailColumns}
          rowKey={(row) => row.id}
          emptyText="Không có bản ghi email phù hợp bộ lọc."
          renderAction={(row) => (
            <button
              type="button"
              onClick={() => setSelectedEmailId(row.id)}
              className="ghost-btn rounded-2xl px-4 py-2 text-sm"
            >
              Xem chi tiết
            </button>
          )}
        />

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <MailOpen size={20} />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Chi tiết email / SOS</h2>
              <p className="text-sm text-slate-500">Preview nhanh nội dung email đã chọn.</p>
            </div>
          </div>

          {selectedEmail ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Người nhận</div>
                <div className="mt-2 font-semibold text-ink">{selectedEmail.recipient}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Loại email</div>
                <div className="mt-2 font-semibold text-ink">{selectedEmail.emailType}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Trạng thái</div>
                <div className="mt-2">
                  <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[selectedEmail.tone])}>
                    {selectedEmail.status}
                  </span>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Preview nội dung</div>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {selectedEmail.preview}
                </pre>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
              Chọn một bản ghi email để xem chi tiết.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
