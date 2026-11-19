import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Building2,
  ChevronRight,
  FileClock,
  Gauge,
  MailOpen,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { EventTable, type EventTableColumn } from '../../components/EventTable';
import { cx, toneChip, type UiTone } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

const tabOptions = [
  { key: 'users', label: 'Người dùng', hint: 'Tài khoản và quyền', icon: UsersRound },
  { key: 'settings', label: 'Cấu hình AI', hint: 'Ngưỡng và SOS', icon: Gauge },
  { key: 'agencies', label: 'Cơ quan', hint: 'Cơ quan tiếp nhận', icon: Building2 },
  { key: 'emails', label: 'Email', hint: 'Nhật ký gửi mail', icon: MailOpen },
  { key: 'logs', label: 'Nhật ký', hint: 'Audit và system', icon: FileClock },
] as const;

type AdminTab = (typeof tabOptions)[number]['key'];

interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_info: string | null;
  cccd_masked: string;
  is_admin: boolean;
  is_active: boolean;
}

interface UserDraft {
  full_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_info: string;
  is_admin: boolean;
  is_active: boolean;
}

interface AgencyRecord {
  id: number;
  region_code: string;
  region_name: string;
  agency_name: string;
  email: string;
  phone: string;
  lat_min: number | null;
  lat_max: number | null;
  lon_min: number | null;
  lon_max: number | null;
  is_default: boolean;
  is_active: boolean;
}

interface AgencyDraft {
  region_code: string;
  address: string;
  agency_name: string;
  email: string;
  phone: string;
  latitude: string;
  longitude: string;
  is_default: boolean;
  is_active: boolean;
}

interface AgencyCreateForm extends AgencyDraft {}

interface SettingsRecord {
  ear_threshold: number;
  mar_threshold: number;
  head_pose_threshold: number;
  eye_closed_frames_threshold: number;
  yawn_frames_threshold: number;
  head_nod_frames_threshold: number;
  sos_hold_seconds: number;
  sound_enabled: boolean;
  auto_send_enabled: boolean;
  email_retry_limit: number;
}

interface EmailLogRecord {
  id: number;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
  sent_at?: string | null;
  retry_count: number;
  error_message?: string | null;
  body_preview?: string;
}

interface DrowsinessLogRecord {
  id: number;
  event_time: string;
  drowsiness_level: number;
}

interface SosLogRecord {
  id: number;
  event_time: string;
  status: string;
  trigger_type: string;
  address?: string | null;
}

interface AuditLogRecord {
  id: number;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | number;
}

interface SystemLogRecord {
  id: number;
  service_name: string;
  log_level: string;
  message: string;
  created_at?: string;
}

const fallbackUsers: AdminUser[] = [
  {
    id: 1,
    full_name: 'Nguyễn Văn A',
    email: 'driver1@example.com',
    phone: '0912345678',
    emergency_contact_name: 'Nguyễn Thị B',
    emergency_contact_phone: '0987654321',
    vehicle_info: '51A-123.45 | Xe tải nhẹ',
    cccd_masked: '079****123',
    is_admin: false,
    is_active: true,
  },
  {
    id: 2,
    full_name: 'Lê Minh C',
    email: 'admin@driversafe.local',
    phone: '0900000001',
    emergency_contact_name: 'Trần Thị D',
    emergency_contact_phone: '0900000002',
    vehicle_info: 'Xe giám sát điều hành',
    cccd_masked: '079****888',
    is_admin: true,
    is_active: true,
  },
];

const fallbackAgencies: AgencyRecord[] = [
  {
    id: 1,
    region_code: 'HCM',
    region_name: 'TP.HCM - Quận 1',
    agency_name: 'Trung tâm tiếp nhận SOS 1',
    email: 'sos.hcm@example.com',
    phone: '02812345678',
    lat_min: 10.776,
    lat_max: 10.776,
    lon_min: 106.7009,
    lon_max: 106.7009,
    is_default: true,
    is_active: true,
  },
  {
    id: 2,
    region_code: 'DNA',
    region_name: 'Đà Nẵng - Hải Châu',
    agency_name: 'Đầu mối hỗ trợ khu vực miền Trung',
    email: 'sos.dn@example.com',
    phone: '0236123456',
    lat_min: 16.0678,
    lat_max: 16.0678,
    lon_min: 108.2208,
    lon_max: 108.2208,
    is_default: false,
    is_active: true,
  },
];

const fallbackSettings: SettingsRecord = {
  ear_threshold: 0.21,
  mar_threshold: 0.6,
  head_pose_threshold: 15,
  eye_closed_frames_threshold: 12,
  yawn_frames_threshold: 8,
  head_nod_frames_threshold: 9,
  sos_hold_seconds: 3,
  sound_enabled: true,
  auto_send_enabled: true,
  email_retry_limit: 3,
};

const fallbackEmailLogs: EmailLogRecord[] = [
  {
    id: 1,
    recipient_email: 'khancap@example.com',
    subject: 'SOS khẩn cấp - Driver Safety AI',
    status: 'sent',
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    retry_count: 0,
    body_preview: 'Người lái đã kích hoạt SOS. Vui lòng kiểm tra vị trí và hỗ trợ ngay.',
  },
  {
    id: 2,
    recipient_email: 'agency@example.com',
    subject: 'Cảnh báo buồn ngủ mức cao',
    status: 'failed',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    sent_at: null,
    retry_count: 2,
    error_message: 'SMTP timeout',
    body_preview: 'Email cảnh báo không gửi được do kết nối máy chủ thư bị gián đoạn.',
  },
];

const fallbackDrowsinessLogs: DrowsinessLogRecord[] = [
  { id: 1, event_time: new Date().toISOString(), drowsiness_level: 2 },
  { id: 2, event_time: new Date(Date.now() - 40 * 60 * 1000).toISOString(), drowsiness_level: 1 },
];

const fallbackSosLogs: SosLogRecord[] = [
  {
    id: 1,
    event_time: new Date().toISOString(),
    status: 'confirmed',
    trigger_type: 'hand_gesture',
    address: 'Khu vực giả lập SOS',
  },
  {
    id: 2,
    event_time: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    status: 'pending',
    trigger_type: 'button',
    address: 'Bãi xe trung tâm',
  },
];

const fallbackAuditLogs: AuditLogRecord[] = [
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
    action: 'update',
    entity_type: 'user',
    entity_id: 5,
  },
];

const fallbackSystemLogs: SystemLogRecord[] = [
  {
    id: 1,
    service_name: 'backend',
    log_level: 'ERROR',
    message: 'Không kết nối được SMTP server trong lần thử thứ nhất.',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    service_name: 'ai-engine',
    log_level: 'INFO',
    message: 'Khởi động pipeline inference từ webcam frontend.',
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

const emptyAgencyForm: AgencyCreateForm = {
  region_code: '',
  address: '',
  agency_name: '',
  email: '',
  phone: '',
  latitude: '',
  longitude: '',
  is_default: false,
  is_active: true,
};

const sliderFields: Array<{
  key: keyof Pick<
    SettingsRecord,
    | 'ear_threshold'
    | 'mar_threshold'
    | 'head_pose_threshold'
    | 'eye_closed_frames_threshold'
    | 'yawn_frames_threshold'
    | 'head_nod_frames_threshold'
    | 'sos_hold_seconds'
    | 'email_retry_limit'
  >;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: 'ear_threshold',
    label: 'EAR',
    description: 'Ngưỡng phát hiện nhắm mắt kéo dài.',
    min: 0.1,
    max: 0.4,
    step: 0.01,
  },
  {
    key: 'mar_threshold',
    label: 'MAR',
    description: 'Ngưỡng nhận diện ngáp hoặc mở miệng bất thường.',
    min: 0.3,
    max: 1,
    step: 0.01,
  },
  {
    key: 'head_pose_threshold',
    label: 'Tư thế đầu',
    description: 'Độ lệch đầu tính theo độ.',
    min: 5,
    max: 35,
    step: 1,
  },
  {
    key: 'eye_closed_frames_threshold',
    label: 'Số khung nhắm mắt',
    description: 'Số frame liên tục để xác nhận nhắm mắt kéo dài.',
    min: 3,
    max: 30,
    step: 1,
  },
  {
    key: 'yawn_frames_threshold',
    label: 'Số khung ngáp',
    description: 'Số frame đủ để xác nhận một chu kỳ ngáp.',
    min: 2,
    max: 20,
    step: 1,
  },
  {
    key: 'head_nod_frames_threshold',
    label: 'Số khung gật đầu',
    description: 'Số frame liên tục để cảnh báo gật gù.',
    min: 2,
    max: 20,
    step: 1,
  },
  {
    key: 'sos_hold_seconds',
    label: 'Số giây giữ SOS',
    description: 'Thời gian duy trì tín hiệu tay để kích hoạt SOS.',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: 'email_retry_limit',
    label: 'Retry email',
    description: 'Số lần gửi lại email khi thất bại.',
    min: 0,
    max: 10,
    step: 1,
  },
];

function statusToneFromBool(isActive: boolean): UiTone {
  return isActive ? 'success' : 'danger';
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

function toneForSystemLevel(level: string): UiTone {
  switch (level.toUpperCase()) {
    case 'ERROR':
    case 'CRITICAL':
      return 'danger';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'info';
    default:
      return 'neutral';
  }
}

function toAgencyDraft(agency: AgencyRecord): AgencyDraft {
  const latitude = agency.lat_min ?? agency.lat_max;
  const longitude = agency.lon_min ?? agency.lon_max;
  return {
    region_code: agency.region_code,
    address: agency.region_name,
    agency_name: agency.agency_name,
    email: agency.email,
    phone: agency.phone,
    latitude: latitude === null ? '' : String(latitude),
    longitude: longitude === null ? '' : String(longitude),
    is_default: agency.is_default,
    is_active: agency.is_active,
  };
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function LogGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5">
      <div>
        <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export function AdminManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [agencyForm, setAgencyForm] = useState<AgencyCreateForm>(emptyAgencyForm);
  const [userDrafts, setUserDrafts] = useState<Record<number, UserDraft>>({});
  const [agencyDrafts, setAgencyDrafts] = useState<Record<number, AgencyDraft>>({});
  const [settingsDraft, setSettingsDraft] = useState<SettingsRecord | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await apiClient.get<AdminUser[]>('/admin/users')).data,
    retry: false,
  });
  const agenciesQuery = useQuery({
    queryKey: ['admin-agencies'],
    queryFn: async () => (await apiClient.get<AgencyRecord[]>('/admin/agencies')).data,
    retry: false,
  });
  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await apiClient.get<SettingsRecord>('/admin/settings')).data,
    retry: false,
  });
  const emailLogsQuery = useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: async () => (await apiClient.get<EmailLogRecord[]>('/admin/email-logs')).data,
    retry: false,
  });
  const drowsinessLogsQuery = useQuery({
    queryKey: ['admin-drowsiness-logs'],
    queryFn: async () => (await apiClient.get<DrowsinessLogRecord[]>('/admin/drowsiness-events')).data,
    retry: false,
  });
  const sosLogsQuery = useQuery({
    queryKey: ['admin-sos-logs'],
    queryFn: async () => (await apiClient.get<SosLogRecord[]>('/admin/sos-events')).data,
    retry: false,
  });
  const auditLogsQuery = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => (await apiClient.get<AuditLogRecord[]>('/admin/audit-logs')).data,
    retry: false,
  });
  const systemLogsQuery = useQuery({
    queryKey: ['admin-system-logs'],
    queryFn: async () => (await apiClient.get<SystemLogRecord[]>('/admin/system-logs')).data,
    retry: false,
  });

  const users = usersQuery.data && usersQuery.data.length > 0 ? usersQuery.data : fallbackUsers;
  const agencies =
    agenciesQuery.data && agenciesQuery.data.length > 0
      ? agenciesQuery.data
      : fallbackAgencies;
  const settings = settingsQuery.data ?? fallbackSettings;
  const emailLogs =
    emailLogsQuery.data && emailLogsQuery.data.length > 0
      ? emailLogsQuery.data
      : fallbackEmailLogs;
  const drowsinessLogs =
    drowsinessLogsQuery.data && drowsinessLogsQuery.data.length > 0
      ? drowsinessLogsQuery.data
      : fallbackDrowsinessLogs;
  const sosLogs =
    sosLogsQuery.data && sosLogsQuery.data.length > 0 ? sosLogsQuery.data : fallbackSosLogs;
  const auditLogs =
    auditLogsQuery.data && auditLogsQuery.data.length > 0
      ? auditLogsQuery.data
      : fallbackAuditLogs;
  const systemLogs =
    systemLogsQuery.data && systemLogsQuery.data.length > 0
      ? systemLogsQuery.data
      : fallbackSystemLogs;

  useEffect(() => {
    const nextDrafts: Record<number, UserDraft> = {};
    users.forEach((user) => {
      nextDrafts[user.id] = {
        full_name: user.full_name,
        phone: user.phone,
        emergency_contact_name: user.emergency_contact_name,
        emergency_contact_phone: user.emergency_contact_phone,
        vehicle_info: user.vehicle_info ?? '',
        is_admin: user.is_admin,
        is_active: user.is_active,
      };
    });
    setUserDrafts(nextDrafts);
    setSelectedUserId((current) => current ?? users[0]?.id ?? null);
  }, [users]);

  useEffect(() => {
    const nextDrafts: Record<number, AgencyDraft> = {};
    agencies.forEach((agency) => {
      nextDrafts[agency.id] = toAgencyDraft(agency);
    });
    setAgencyDrafts(nextDrafts);
    setSelectedAgencyId((current) => current ?? agencies[0]?.id ?? null);
  }, [agencies]);

  useEffect(() => {
    setSelectedEmailId((current) => current ?? emailLogs[0]?.id ?? null);
  }, [emailLogs]);

  useEffect(() => {
    if (!settingsDraft) {
      setSettingsDraft(settings);
    }
  }, [settings, settingsDraft]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedAgency = agencies.find((agency) => agency.id === selectedAgencyId) ?? null;
  const selectedEmail = emailLogs.find((log) => log.id === selectedEmailId) ?? null;

  function setSuccess(messageText: string) {
    setMessageType('success');
    setMessage(messageText);
  }

  function setError(error: unknown, fallback: string) {
    setMessageType('error');
    setMessage(getApiErrorMessage(error, fallback));
  }

  function updateUserDraft<K extends keyof UserDraft>(userId: number, key: K, value: UserDraft[K]) {
    setUserDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }));
  }

  function updateAgencyDraft<K extends keyof AgencyDraft>(
    agencyId: number,
    key: K,
    value: AgencyDraft[K],
  ) {
    setAgencyDrafts((prev) => ({
      ...prev,
      [agencyId]: {
        ...prev[agencyId],
        [key]: value,
      },
    }));
  }

  async function saveUser(userId: number) {
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }

    try {
      await apiClient.put(`/admin/users/${userId}`, draft);
      setSuccess('Đã lưu thông tin người dùng và đồng bộ quyền quản trị.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: unknown) {
      setError(error, 'Không lưu được thông tin người dùng.');
    }
  }

  async function toggleUserStatus(userId: number, isActive: boolean) {
    try {
      await apiClient.patch(`/admin/users/${userId}/status?is_active=${(!isActive).toString()}`);
      setSuccess('Đã cập nhật trạng thái người dùng.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: unknown) {
      setError(error, 'Không cập nhật được trạng thái người dùng.');
    }
  }

  async function saveSettings() {
    if (!settingsDraft) {
      return;
    }

    const payload = {
      ear_threshold: Number(settingsDraft.ear_threshold),
      mar_threshold: Number(settingsDraft.mar_threshold),
      head_pose_threshold: Number(settingsDraft.head_pose_threshold),
      eye_closed_frames_threshold: Number(settingsDraft.eye_closed_frames_threshold),
      yawn_frames_threshold: Number(settingsDraft.yawn_frames_threshold),
      head_nod_frames_threshold: Number(settingsDraft.head_nod_frames_threshold),
      sos_hold_seconds: Number(settingsDraft.sos_hold_seconds),
      sound_enabled: Boolean(settingsDraft.sound_enabled),
      auto_send_enabled: Boolean(settingsDraft.auto_send_enabled),
      email_retry_limit: Number(settingsDraft.email_retry_limit),
    };

    if (Object.values(payload).some((value) => typeof value === 'number' && Number.isNaN(value))) {
      setMessageType('error');
      setMessage('Không lưu được cấu hình AI: có trường số không hợp lệ.');
      return;
    }

    try {
      await apiClient.put('/admin/settings', payload);
      setSuccess('Đã cập nhật cấu hình hệ thống.');
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    } catch (error: unknown) {
      setError(error, 'Không lưu được cấu hình AI.');
    }
  }

  async function submitAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiClient.post('/admin/agencies', {
        region_code: agencyForm.region_code,
        region_name: agencyForm.address,
        agency_name: agencyForm.agency_name,
        email: agencyForm.email,
        phone: agencyForm.phone,
        lat_min: parseCoordinate(agencyForm.latitude),
        lat_max: parseCoordinate(agencyForm.latitude),
        lon_min: parseCoordinate(agencyForm.longitude),
        lon_max: parseCoordinate(agencyForm.longitude),
        is_default: agencyForm.is_default,
        is_active: agencyForm.is_active,
      });
      setAgencyForm(emptyAgencyForm);
      setSuccess('Đã tạo cơ quan tiếp nhận mới.');
      await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
    } catch (error: unknown) {
      setError(error, 'Không tạo được cơ quan tiếp nhận.');
    }
  }

  async function saveAgency(agencyId: number) {
    const draft = agencyDrafts[agencyId];
    if (!draft) {
      return;
    }

    try {
      await apiClient.put(`/admin/agencies/${agencyId}`, {
        region_name: draft.address,
        agency_name: draft.agency_name,
        email: draft.email,
        phone: draft.phone,
        lat_min: parseCoordinate(draft.latitude),
        lat_max: parseCoordinate(draft.latitude),
        lon_min: parseCoordinate(draft.longitude),
        lon_max: parseCoordinate(draft.longitude),
        is_default: draft.is_default,
        is_active: draft.is_active,
      });
      setSuccess('Đã cập nhật cơ quan tiếp nhận.');
      await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
    } catch (error: unknown) {
      setError(error, 'Không lưu được cơ quan tiếp nhận.');
    }
  }

  async function removeAgency(agencyId: number) {
    try {
      await apiClient.delete(`/admin/agencies/${agencyId}`);
      setSuccess('Đã xóa cơ quan tiếp nhận.');
      await queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      setSelectedAgencyId((current) => (current === agencyId ? null : current));
    } catch (error: unknown) {
      setError(error, 'Không xóa được cơ quan tiếp nhận.');
    }
  }

  async function retryEmail(logId: number) {
    try {
      await apiClient.post(`/admin/email-logs/${logId}/retry`);
      setSuccess('Đã gửi lại email.');
      await queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    } catch (error: unknown) {
      setError(error, 'Không gửi lại được email.');
    }
  }

  const userColumns: Array<EventTableColumn<AdminUser>> = [
    {
      key: 'user',
      header: 'Người dùng',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.full_name}</div>
          <div className="mt-1 text-xs text-slate-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'cccd',
      header: 'CCCD',
      render: (row) => row.cccd_masked,
    },
    {
      key: 'role',
      header: 'Quyền',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.is_admin ? 'info' : 'neutral'])}>
            {row.is_admin ? 'Admin' : 'User'}
          </span>
          <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[statusToneFromBool(row.is_active)])}>
            {row.is_active ? 'Hoạt động' : 'Bị khóa'}
          </span>
        </div>
      ),
    },
  ];

  const agencyColumns: Array<EventTableColumn<AgencyRecord>> = [
    {
      key: 'agency',
      header: 'Cơ quan',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.agency_name}</div>
          <div className="mt-1 text-xs text-slate-500">{row.region_name}</div>
        </div>
      ),
    },
    { key: 'contact', header: 'Liên hệ', render: (row) => `${row.email} | ${row.phone}` },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[row.is_default ? 'warning' : 'neutral'])}>
            {row.is_default ? 'Mặc định' : row.region_code}
          </span>
          <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[statusToneFromBool(row.is_active)])}>
            {row.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
          </span>
        </div>
      ),
    },
  ];

  const emailColumns: Array<EventTableColumn<EmailLogRecord>> = [
    {
      key: 'recipient',
      header: 'Người nhận',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.recipient_email}</div>
          <div className="mt-1 text-xs text-slate-500">
            {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Loại email',
      render: (row) => row.subject,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[toneForEmailStatus(row.status)])}>
          {row.status}
        </span>
      ),
    },
  ];

  const errorMessage =
    (usersQuery.error && getApiErrorMessage(usersQuery.error, 'Không tải được danh sách người dùng.')) ||
    (agenciesQuery.error && getApiErrorMessage(agenciesQuery.error, 'Không tải được danh sách cơ quan.')) ||
    (settingsQuery.error && getApiErrorMessage(settingsQuery.error, 'Không tải được cấu hình AI.')) ||
    (emailLogsQuery.error && getApiErrorMessage(emailLogsQuery.error, 'Không tải được email log.'));

  return (
    <div className="space-y-6">
      {message ? (
        <AlertBanner
          level={messageType === 'error' ? 'danger' : 'success'}
          title={messageType === 'error' ? 'Thao tác chưa thành công' : 'Đã cập nhật dữ liệu'}
          description={message}
        />
      ) : null}
      {errorMessage ? (
        <AlertBanner
          level="warning"
          title="Một phần dữ liệu quản trị đang dùng dữ liệu dự phòng"
          description={errorMessage}
        />
      ) : null}

      <section className="card p-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  'min-w-[180px] rounded-[24px] border px-4 py-4 text-left transition',
                  isActive
                    ? 'border-ink bg-ink text-white shadow-panel'
                    : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white',
                )}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} />
                  <div>
                    <div className="text-sm font-semibold">{tab.label}</div>
                    <div className={cx('mt-1 text-xs', isActive ? 'text-slate-200' : 'text-slate-500')}>
                      {tab.hint}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'users' ? (
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <EventTable
            title="Danh sách người dùng"
            subtitle="Bảng tài khoản giúp quản trị nhanh vai trò, trạng thái và thông tin liên hệ."
            rows={users}
            columns={userColumns}
            rowKey={(row) => row.id}
            renderAction={(row) => (
              <button
                type="button"
                onClick={() => setSelectedUserId(row.id)}
                className="ghost-btn rounded-2xl px-4 py-2 text-sm"
              >
                Chỉnh sửa
              </button>
            )}
          />

          <section className="card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                <UsersRound size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Chi tiết người dùng</h2>
                <p className="text-sm text-slate-500">Chỉnh hồ sơ, cấp quyền admin và khóa/mở khóa nhanh.</p>
              </div>
            </div>

            {selectedUser && userDrafts[selectedUser.id] ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-lg font-semibold text-ink">{selectedUser.full_name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedUser.email} | CCCD {selectedUser.cccd_masked}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="label-shell">Họ tên</label>
                    <input className="input-shell" value={userDrafts[selectedUser.id].full_name} onChange={(e) => updateUserDraft(selectedUser.id, 'full_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-shell">Số điện thoại</label>
                    <input className="input-shell" value={userDrafts[selectedUser.id].phone} onChange={(e) => updateUserDraft(selectedUser.id, 'phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-shell">Liên hệ khẩn cấp</label>
                    <input className="input-shell" value={userDrafts[selectedUser.id].emergency_contact_name} onChange={(e) => updateUserDraft(selectedUser.id, 'emergency_contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-shell">Số điện thoại khẩn cấp</label>
                    <input className="input-shell" value={userDrafts[selectedUser.id].emergency_contact_phone} onChange={(e) => updateUserDraft(selectedUser.id, 'emergency_contact_phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-shell">Thông tin xe</label>
                    <input className="input-shell" value={userDrafts[selectedUser.id].vehicle_info} onChange={(e) => updateUserDraft(selectedUser.id, 'vehicle_info', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={userDrafts[selectedUser.id].is_admin} onChange={(e) => updateUserDraft(selectedUser.id, 'is_admin', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    Cấp quyền quản trị viên
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={userDrafts[selectedUser.id].is_active} onChange={(e) => updateUserDraft(selectedUser.id, 'is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    Tài khoản đang hoạt động
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => void saveUser(selectedUser.id)} className="primary-btn flex-1 rounded-[24px] py-3">
                    Lưu người dùng
                  </button>
                  <button type="button" onClick={() => void toggleUserStatus(selectedUser.id, userDrafts[selectedUser.id].is_active)} className="ghost-btn flex-1 rounded-[24px] py-3">
                    {userDrafts[selectedUser.id].is_active ? 'Khóa nhanh' : 'Mở khóa nhanh'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                Chọn một người dùng từ bảng để bắt đầu chỉnh sửa.
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === 'settings' ? (
        <section className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Cấu hình AI</h2>
                <p className="text-sm text-slate-500">
                  Điều chỉnh ngưỡng phát hiện, cảnh báo âm thanh và thời gian giữ SOS.
                </p>
              </div>
            </div>

            {settingsDraft ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {sliderFields.map((field) => (
                  <div key={field.key} className="rounded-[24px] border border-slate-200 bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-ink">{field.label}</div>
                        <div className="mt-1 text-sm text-slate-500">{field.description}</div>
                      </div>
                      <input
                        type="number"
                        className="w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        value={settingsDraft[field.key]}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onChange={(e) =>
                          setSettingsDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  [field.key]: Number(e.target.value),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={settingsDraft[field.key]}
                      onChange={(e) =>
                        setSettingsDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                [field.key]: Number(e.target.value),
                              }
                            : prev,
                        )
                      }
                      className="mt-4 h-2 w-full cursor-pointer accent-slate-900"
                    />
                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>{field.min}</span>
                      <span>{field.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {settingsDraft ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-[24px] border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-ink">Âm thanh cảnh báo</div>
                  <div className="mt-1 text-slate-500">Phát giọng nói cảnh báo trực tiếp trên trình duyệt.</div>
                  <div className="mt-4">
                    <input type="checkbox" checked={settingsDraft.sound_enabled} onChange={(e) => setSettingsDraft({ ...settingsDraft, sound_enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  </div>
                </label>
                <label className="rounded-[24px] border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-ink">Tự động gửi SOS</div>
                  <div className="mt-1 text-slate-500">Kích hoạt quy trình SOS khi tín hiệu tay được xác nhận.</div>
                  <div className="mt-4">
                    <input type="checkbox" checked={settingsDraft.auto_send_enabled} onChange={(e) => setSettingsDraft({ ...settingsDraft, auto_send_enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  </div>
                </label>
              </div>
              <button type="button" onClick={() => void saveSettings()} className="primary-btn rounded-[24px] px-8 py-4">
                Lưu cấu hình
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'agencies' ? (
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Thêm cơ quan tiếp nhận</h2>
                <p className="text-sm text-slate-500">
                  Tạo đầu mối SOS mới với địa chỉ/khu vực, email và tọa độ trọng tâm.
                </p>
              </div>
            </div>

            <form onSubmit={submitAgency} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input className="input-shell" placeholder="Mã khu vực" value={agencyForm.region_code} onChange={(e) => setAgencyForm((prev) => ({ ...prev, region_code: e.target.value }))} required />
              <input className="input-shell" placeholder="Địa chỉ / khu vực" value={agencyForm.address} onChange={(e) => setAgencyForm((prev) => ({ ...prev, address: e.target.value }))} required />
              <input className="input-shell" placeholder="Tên cơ quan" value={agencyForm.agency_name} onChange={(e) => setAgencyForm((prev) => ({ ...prev, agency_name: e.target.value }))} required />
              <input className="input-shell" placeholder="Email" type="email" value={agencyForm.email} onChange={(e) => setAgencyForm((prev) => ({ ...prev, email: e.target.value }))} required />
              <input className="input-shell" placeholder="Số điện thoại" value={agencyForm.phone} onChange={(e) => setAgencyForm((prev) => ({ ...prev, phone: e.target.value }))} required />
              <input className="input-shell" placeholder="Lat" value={agencyForm.latitude} onChange={(e) => setAgencyForm((prev) => ({ ...prev, latitude: e.target.value }))} />
              <input className="input-shell" placeholder="Lon" value={agencyForm.longitude} onChange={(e) => setAgencyForm((prev) => ({ ...prev, longitude: e.target.value }))} />
              <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={agencyForm.is_default} onChange={(e) => setAgencyForm((prev) => ({ ...prev, is_default: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                  Mặc định
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={agencyForm.is_active} onChange={(e) => setAgencyForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                  Đang hoạt động
                </label>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <button type="submit" className="primary-btn rounded-[24px] px-8 py-4">
                  Tạo cơ quan
                </button>
              </div>
            </form>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <EventTable
              title="Danh sách cơ quan tiếp nhận"
              subtitle="Theo dõi đầu mối hỗ trợ khẩn cấp và chuyển tiếp chỉnh sửa sang panel chi tiết."
              rows={agencies}
              columns={agencyColumns}
              rowKey={(row) => row.id}
              renderAction={(row) => (
                <button
                  type="button"
                  onClick={() => setSelectedAgencyId(row.id)}
                  className="ghost-btn rounded-2xl px-4 py-2 text-sm"
                >
                  Chỉnh sửa
                </button>
              )}
            />

            <section className="card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">Chi tiết cơ quan</h2>
                  <p className="text-sm text-slate-500">Sửa nhanh thông tin liên hệ và trạng thái hoạt động.</p>
                </div>
              </div>

              {selectedAgency && agencyDrafts[selectedAgency.id] ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-lg font-semibold text-ink">{selectedAgency.agency_name}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedAgency.region_code}</div>
                  </div>
                  <input className="input-shell" value={agencyDrafts[selectedAgency.id].region_code} readOnly />
                  <input className="input-shell" value={agencyDrafts[selectedAgency.id].address} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'address', e.target.value)} placeholder="Địa chỉ / khu vực" />
                  <input className="input-shell" value={agencyDrafts[selectedAgency.id].agency_name} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'agency_name', e.target.value)} placeholder="Tên cơ quan" />
                  <input className="input-shell" value={agencyDrafts[selectedAgency.id].email} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'email', e.target.value)} placeholder="Email" />
                  <input className="input-shell" value={agencyDrafts[selectedAgency.id].phone} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'phone', e.target.value)} placeholder="Số điện thoại" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="input-shell" value={agencyDrafts[selectedAgency.id].latitude} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'latitude', e.target.value)} placeholder="Lat" />
                    <input className="input-shell" value={agencyDrafts[selectedAgency.id].longitude} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'longitude', e.target.value)} placeholder="Lon" />
                  </div>
                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={agencyDrafts[selectedAgency.id].is_default} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'is_default', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                      Cơ quan mặc định
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={agencyDrafts[selectedAgency.id].is_active} onChange={(e) => updateAgencyDraft(selectedAgency.id, 'is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                      Đang hoạt động
                    </label>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => void saveAgency(selectedAgency.id)} className="primary-btn flex-1 rounded-[24px] py-3">
                      Lưu cơ quan
                    </button>
                    <button type="button" onClick={() => void removeAgency(selectedAgency.id)} className="ghost-btn flex-1 rounded-[24px] py-3 text-red-600">
                      Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Chọn một cơ quan từ bảng để chỉnh sửa.
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === 'emails' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <EventTable
            title="Nhật ký email SOS"
            subtitle="Theo dõi trạng thái gửi email, retry và chọn một bản ghi để xem chi tiết."
            rows={emailLogs}
            columns={emailColumns}
            rowKey={(row) => row.id}
            renderAction={(row) => (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedEmailId(row.id)}
                  className="ghost-btn rounded-2xl px-4 py-2 text-sm"
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => void retryEmail(row.id)}
                  className="primary-btn rounded-2xl px-4 py-2 text-sm"
                >
                  Gửi lại
                </button>
              </>
            )}
          />

          <section className="card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                <BellRing size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Chi tiết email</h2>
                <p className="text-sm text-slate-500">Preview nội dung và thông tin retry của bản ghi đang chọn.</p>
              </div>
            </div>

            {selectedEmail ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Người nhận</div>
                  <div className="mt-2 font-semibold text-ink">{selectedEmail.recipient_email}</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Tiêu đề</div>
                  <div className="mt-2 font-semibold text-ink">{selectedEmail.subject}</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Trạng thái</div>
                  <div className="mt-2">
                    <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[toneForEmailStatus(selectedEmail.status)])}>
                      {selectedEmail.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Retry</div>
                  <div className="mt-2 text-sm text-slate-700">{selectedEmail.retry_count} lần</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Preview nội dung</div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedEmail.body_preview ?? selectedEmail.error_message ?? 'Không có preview.'}
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
      ) : null}

      {activeTab === 'logs' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <LogGroup
            title="Buồn ngủ"
            subtitle="Nhóm log sự kiện drowsiness gần đây theo mức độ cảnh báo."
          >
            {drowsinessLogs.slice(0, 5).map((item) => {
              const tone: UiTone =
                item.drowsiness_level >= 3
                  ? 'danger'
                  : item.drowsiness_level >= 1
                    ? 'warning'
                    : 'success';
              return (
                <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-ink">Sự kiện #{item.id}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {new Date(item.event_time).toLocaleString()}
                      </div>
                    </div>
                    <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[tone])}>
                      Mức {item.drowsiness_level}
                    </span>
                  </div>
                </div>
              );
            })}
          </LogGroup>

          <LogGroup
            title="SOS"
            subtitle="Luồng sự kiện SOS gần nhất với trạng thái xử lý."
          >
            {sosLogs.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="font-semibold text-ink">
                  {item.trigger_type === 'hand_gesture' ? 'SOS tay' : 'SOS nút bấm'}
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="text-sm text-slate-500">{item.address ?? 'Không có địa chỉ'}</div>
                  <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[toneForEmailStatus(item.status)])}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </LogGroup>

          <LogGroup
            title="Audit"
            subtitle="Nhật ký thao tác quản trị dùng cho kiểm tra và truy vết."
          >
            {auditLogs.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold uppercase text-ink">{item.action}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.entity_type} #{item.entity_id}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </LogGroup>

          <LogGroup
            title="System"
            subtitle="Theo dõi backend, AI engine và các lỗi vận hành mới nhất."
          >
            {systemLogs.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-ink">{item.service_name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.message}</div>
                  </div>
                  <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[toneForSystemLevel(item.log_level)])}>
                    {item.log_level}
                  </span>
                </div>
              </div>
            ))}
          </LogGroup>
        </div>
      ) : null}
    </div>
  );
}
