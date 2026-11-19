import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BellRing,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { EventTable, type EventTableColumn } from '../../components/EventTable';
import { MiniTrendChart } from '../../components/MiniTrendChart';
import { StatCard } from '../../components/StatCard';
import { StatusDonutChart } from '../../components/StatusDonutChart';
import { cx, toneChip, type UiTone } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

interface Summary {
  total_users: number;
  total_admins: number;
  total_drowsiness_events: number;
  total_sos_events: number;
  email_success_rate: number;
  system_error_count: number;
}

interface SosLog {
  id: number;
  event_time: string;
  status: string;
  trigger_type: string;
  address?: string | null;
}

interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | number;
}

interface DrowsinessLog {
  id: number;
  event_time: string;
  drowsiness_level: number;
}

interface TableRow {
  id: number;
  time: string;
  primary: string;
  secondary: string;
  status: string;
  tone: UiTone;
}

const fallbackSummary: Summary = {
  total_users: 28,
  total_admins: 3,
  total_drowsiness_events: 146,
  total_sos_events: 18,
  email_success_rate: 93.5,
  system_error_count: 4,
};

const fallbackSosLogs: SosLog[] = [
  {
    id: 1,
    event_time: new Date().toISOString(),
    status: 'confirmed',
    trigger_type: 'hand_gesture',
    address: 'Quốc lộ 1A - khu vực mô phỏng',
  },
  {
    id: 2,
    event_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'pending',
    trigger_type: 'button',
    address: 'Nút giao thông minh',
  },
  {
    id: 3,
    event_time: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    status: 'failed',
    trigger_type: 'button',
    address: 'Bãi thử nghiệm',
  },
];

const fallbackAuditLogs: AuditLog[] = [
  {
    id: 1,
    created_at: new Date().toISOString(),
    action: 'update',
    entity_type: 'settings',
    entity_id: 'global',
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
    action: 'retry_email',
    entity_type: 'email_log',
    entity_id: 12,
  },
];

const fallbackDrowsinessLogs: DrowsinessLog[] = [
  {
    id: 1,
    event_time: new Date().toISOString(),
    drowsiness_level: 2,
  },
  {
    id: 2,
    event_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    drowsiness_level: 1,
  },
  {
    id: 3,
    event_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    drowsiness_level: 3,
  },
];

function translateSosStatus(status: string) {
  switch (status) {
    case 'confirmed':
      return 'Đã xác nhận';
    case 'sent':
      return 'Đã gửi';
    case 'pending':
      return 'Đang xử lý';
    case 'failed':
      return 'Thất bại';
    default:
      return status;
  }
}

function toneForSosStatus(status: string): UiTone {
  switch (status) {
    case 'confirmed':
    case 'sent':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
}

function buildTrendValues(drowsinessLogs: DrowsinessLog[]) {
  const now = new Date();
  const keys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const values = keys.map(
    (key) =>
      drowsinessLogs.filter((log) => log.event_time.slice(0, 10) === key).length,
  );
  const labels = keys.map((key) => key.slice(5));
  return {
    values: values.some((value) => value > 0) ? values : [3, 5, 4, 6, 2, 4, 5],
    labels,
  };
}

export function AdminDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['admin-summary'],
    queryFn: async () => (await apiClient.get<Summary>('/admin/dashboard/summary')).data,
    retry: false,
  });

  const sosQuery = useQuery({
    queryKey: ['admin-sos-events'],
    queryFn: async () => (await apiClient.get<SosLog[]>('/admin/sos-events')).data,
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => (await apiClient.get<AuditLog[]>('/admin/audit-logs')).data,
    retry: false,
  });

  const drowsinessQuery = useQuery({
    queryKey: ['admin-drowsiness-events'],
    queryFn: async () => (await apiClient.get<DrowsinessLog[]>('/admin/drowsiness-events')).data,
    retry: false,
  });

  const summary = summaryQuery.data ?? fallbackSummary;
  const sosRows = sosQuery.data && sosQuery.data.length > 0 ? sosQuery.data : fallbackSosLogs;
  const auditRows =
    auditQuery.data && auditQuery.data.length > 0 ? auditQuery.data : fallbackAuditLogs;
  const drowsinessRows =
    drowsinessQuery.data && drowsinessQuery.data.length > 0
      ? drowsinessQuery.data
      : fallbackDrowsinessLogs;

  const sosTableRows = useMemo<TableRow[]>(
    () =>
      sosRows.slice(0, 6).map((item) => ({
        id: item.id,
        time: new Date(item.event_time).toLocaleString(),
        primary: item.trigger_type === 'hand_gesture' ? 'SOS tay' : 'SOS nút bấm',
        secondary: item.address ?? 'Không rõ vị trí',
        status: translateSosStatus(item.status),
        tone: toneForSosStatus(item.status),
      })),
    [sosRows],
  );

  const auditTableRows = useMemo<TableRow[]>(
    () =>
      auditRows.slice(0, 6).map((item) => ({
        id: item.id,
        time: new Date(item.created_at).toLocaleString(),
        primary: item.action,
        secondary: `${item.entity_type} #${item.entity_id}`,
        status: 'Audit log',
        tone: 'info',
      })),
    [auditRows],
  );

  const sosColumns: Array<EventTableColumn<TableRow>> = [
    { key: 'time', header: 'Thời gian', render: (row) => row.time },
    {
      key: 'primary',
      header: 'Sự kiện',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.primary}</div>
          <div className="mt-1 text-xs text-slate-500">{row.secondary}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.tone])}>
          {row.status}
        </span>
      ),
    },
  ];

  const auditColumns: Array<EventTableColumn<TableRow>> = [
    { key: 'time', header: 'Thời gian', render: (row) => row.time },
    {
      key: 'primary',
      header: 'Thao tác',
      render: (row) => (
        <div>
          <div className="font-semibold uppercase text-ink">{row.primary}</div>
          <div className="mt-1 text-xs text-slate-500">{row.secondary}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Loại log',
      render: (row) => (
        <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.tone])}>
          {row.status}
        </span>
      ),
    },
  ];

  const alertTrend = buildTrendValues(drowsinessRows);
  const sosStatusSegments = useMemo(() => {
    const counters = {
      success: 0,
      warning: 0,
      danger: 0,
    };

    sosRows.forEach((item) => {
      const tone = toneForSosStatus(item.status);
      if (tone === 'success') counters.success += 1;
      if (tone === 'warning') counters.warning += 1;
      if (tone === 'danger') counters.danger += 1;
    });

    if (!counters.success && !counters.warning && !counters.danger) {
      return [
        { label: 'Đã gửi / xác nhận', value: 8, tone: 'success' as const },
        { label: 'Đang xử lý', value: 4, tone: 'warning' as const },
        { label: 'Thất bại', value: 2, tone: 'danger' as const },
      ];
    }

    return [
      { label: 'Đã gửi / xác nhận', value: counters.success, tone: 'success' as const },
      { label: 'Đang xử lý', value: counters.warning, tone: 'warning' as const },
      { label: 'Thất bại', value: counters.danger, tone: 'danger' as const },
    ];
  }, [sosRows]);

  const errorMessage =
    (summaryQuery.error &&
      getApiErrorMessage(summaryQuery.error, 'Không tải được dữ liệu tổng quan quản trị.')) ||
    (sosQuery.error &&
      getApiErrorMessage(sosQuery.error, 'Không tải được sự kiện SOS.')) ||
    (auditQuery.error &&
      getApiErrorMessage(auditQuery.error, 'Không tải được audit log.')) ||
    (drowsinessQuery.error &&
      getApiErrorMessage(drowsinessQuery.error, 'Không tải được dữ liệu cảnh báo buồn ngủ.'));

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <AlertBanner
          level="warning"
          title="Dashboard quản trị đang dùng một phần dữ liệu dự phòng"
          description={errorMessage}
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Người dùng"
          value={summary.total_users}
          hint={`Quản trị viên đang hoạt động: ${summary.total_admins}`}
          icon={UsersRound}
          tone="info"
          trend="Theo dõi tăng trưởng tài khoản"
        />
        <StatCard
          title="Cảnh báo buồn ngủ"
          value={summary.total_drowsiness_events}
          hint="Tổng số sự kiện buồn ngủ đã được hệ thống ghi nhận."
          icon={AlertTriangle}
          tone="warning"
          trend="Realtime event tracking"
        />
        <StatCard
          title="Sự kiện SOS"
          value={summary.total_sos_events}
          hint={`Tỷ lệ email thành công ${summary.email_success_rate.toFixed(1)}%`}
          icon={BellRing}
          tone="danger"
          trend="Khẩn cấp được ưu tiên xử lý"
        />
        <StatCard
          title="Lỗi hệ thống"
          value={summary.system_error_count}
          hint="Nhật ký hệ thống mức lỗi hoặc nghiêm trọng cần theo dõi."
          icon={ShieldAlert}
          tone={summary.system_error_count > 0 ? 'warning' : 'success'}
          trend={summary.system_error_count > 0 ? 'Cần rà soát vận hành' : 'Ổn định'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <EventTable
          title="Sự kiện SOS mới nhất"
          subtitle="Các kích hoạt SOS gần đây để giám sát phản hồi và trạng thái xử lý."
          rows={sosTableRows}
          columns={sosColumns}
          rowKey={(row) => row.id}
        />
        <EventTable
          title="Nhật ký kiểm tra"
          subtitle="Lưu vết thao tác quản trị, chỉnh cấu hình và các hành động nhạy cảm."
          rows={auditTableRows}
          columns={auditColumns}
          rowKey={(row) => row.id}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MiniTrendChart
          title="Cảnh báo buồn ngủ theo ngày"
          subtitle="Biểu đồ nhỏ giúp nhận diện xu hướng tăng/giảm của cảnh báo trong tuần."
          values={alertTrend.values}
          labels={alertTrend.labels}
          tone="warning"
        />
        <StatusDonutChart
          title="Trạng thái SOS"
          subtitle="Phân bổ sự kiện SOS theo tình trạng đã gửi, đang xử lý hoặc thất bại."
          segments={sosStatusSegments}
        />
      </div>
    </div>
  );
}
