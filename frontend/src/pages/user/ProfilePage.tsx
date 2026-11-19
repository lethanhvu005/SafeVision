import { FormEvent, useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  CarFront,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { useAuthStore } from '../../store/auth';
import { getApiErrorMessage } from '../../utils/apiError';

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  cccd: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_info: string | null;
}

interface ProfileForm {
  full_name: string;
  cccd: string;
  phone: string;
  email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_info: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

const emptyForm: ProfileForm = {
  full_name: '',
  cccd: '',
  phone: '',
  email: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  vehicle_info: '',
};

const emptyPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
  confirm_new_password: '',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function validatePasswordStrength(password: string) {
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu mới phải có ít nhất 1 chữ hoa.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu mới phải có ít nhất 1 chữ thường.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu mới phải có ít nhất 1 chữ số.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt.';
  }
  return null;
}

function validatePasswordForm(form: PasswordForm) {
  if (!form.current_password || !form.new_password || !form.confirm_new_password) {
    return 'Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới.';
  }
  const strengthError = validatePasswordStrength(form.new_password);
  if (strengthError) {
    return strengthError;
  }
  if (form.new_password !== form.confirm_new_password) {
    return 'Xác nhận mật khẩu mới không khớp.';
  }
  if (form.current_password === form.new_password) {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }
  return null;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success');
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-me'],
    queryFn: async () => (await apiClient.get<UserProfile>('/profile/me')).data,
    retry: false,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm({
      full_name: profileQuery.data.full_name ?? '',
      cccd: profileQuery.data.cccd ?? '',
      phone: profileQuery.data.phone ?? '',
      email: profileQuery.data.email ?? '',
      emergency_contact_name: profileQuery.data.emergency_contact_name ?? '',
      emergency_contact_phone: profileQuery.data.emergency_contact_phone ?? '',
      vehicle_info: profileQuery.data.vehicle_info ?? '',
    });
  }, [profileQuery.data]);

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePasswordField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    if (!profileQuery.data) {
      return;
    }
    setForm({
      full_name: profileQuery.data.full_name ?? '',
      cccd: profileQuery.data.cccd ?? '',
      phone: profileQuery.data.phone ?? '',
      email: profileQuery.data.email ?? '',
      emergency_contact_name: profileQuery.data.emergency_contact_name ?? '',
      emergency_contact_phone: profileQuery.data.emergency_contact_phone ?? '',
      vehicle_info: profileQuery.data.vehicle_info ?? '',
    });
    setProfileMessage(null);
  }

  function resetPasswordForm() {
    setPasswordForm(emptyPasswordForm);
    setPasswordMessage(null);
  }

  function getErrorMessage(error: unknown) {
    return getApiErrorMessage(error, 'Không lưu được hồ sơ.');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setIsSaving(true);

    try {
      await apiClient.put('/profile/me', {
        full_name: form.full_name,
        phone: form.phone,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        vehicle_info: form.vehicle_info,
      });
      setProfileMessageType('success');
      setProfileMessage('Đã lưu thay đổi hồ sơ người lái.');
      await profileQuery.refetch();
    } catch (error: unknown) {
      setProfileMessageType('error');
      setProfileMessage(`Không lưu được hồ sơ: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);

    const validationError = validatePasswordForm(passwordForm);
    if (validationError) {
      setPasswordMessageType('error');
      setPasswordMessage(validationError);
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiClient.put('/profile/password', passwordForm);
      setPasswordMessageType('success');
      setPasswordMessage(response.data.message ?? 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      setPasswordForm(emptyPasswordForm);
      window.setTimeout(() => {
        logout();
        navigate('/login');
      }, 1200);
    } catch (error: unknown) {
      setPasswordMessageType('error');
      setPasswordMessage(getApiErrorMessage(error, 'Không đổi được mật khẩu.'));
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <section className="space-y-6">
        <div className="card overflow-hidden p-6">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,#07111f_0%,#10213f_100%)] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-slate-300">HỒ SƠ NGƯỜI LÁI</p>
                <h1 className="mt-3 font-display text-3xl font-semibold">{form.full_name || 'Tài xế'}</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Cập nhật thông tin cá nhân, liên hệ khẩn cấp và bảo vệ tài khoản để quy trình SOS luôn chính xác.
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/10 text-xl font-semibold">
                {getInitials(form.full_name || 'TX')}
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100">
              <BadgeCheck size={16} />
              Tài xế
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">Email đăng nhập</div>
                <div className="text-sm text-slate-500">{form.email || 'Chưa có dữ liệu'}</div>
              </div>
            </div>
          </article>
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <CarFront size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">Phương tiện</div>
                <div className="text-sm text-slate-500">{form.vehicle_info || 'Chưa khai báo'}</div>
              </div>
            </div>
          </article>
          <article className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">CCCD</div>
                <div className="text-sm text-slate-500">{form.cccd || 'Chưa có dữ liệu'}</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div className="space-y-6">
        <form onSubmit={onSubmit} className="card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">Cập nhật hồ sơ</h2>
              <p className="mt-2 text-sm text-slate-500">
                Các trường CCCD và email được khóa để đảm bảo tính nhất quán dữ liệu.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/6 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-900/8">
              <UserRound size={16} />
              Hồ sơ realtime
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {profileQuery.isError ? (
              <AlertBanner
                level="danger"
                title="Không tải được hồ sơ"
                description="Dữ liệu tài khoản hiện tại chưa truy vấn được từ backend."
              />
            ) : null}
            {profileMessage ? (
              <AlertBanner
                level={profileMessageType === 'error' ? 'danger' : 'success'}
                title={profileMessageType === 'error' ? 'Lưu thất bại' : 'Đã lưu thay đổi'}
                description={profileMessage}
              />
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-shell">Họ tên</label>
              <input className="input-shell" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
            </div>
            <div>
              <label className="label-shell">CCCD</label>
              <input className="input-shell cursor-not-allowed bg-slate-50 text-slate-500" value={form.cccd} readOnly />
            </div>
            <div>
              <label className="label-shell">Số điện thoại</label>
              <div className="relative">
                <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input-shell pl-11" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label-shell">Email</label>
              <input className="input-shell cursor-not-allowed bg-slate-50 text-slate-500" value={form.email} readOnly />
            </div>
            <div>
              <label className="label-shell">Liên hệ khẩn cấp</label>
              <input className="input-shell" value={form.emergency_contact_name} onChange={(e) => updateField('emergency_contact_name', e.target.value)} />
            </div>
            <div>
              <label className="label-shell">Số điện thoại khẩn cấp</label>
              <input className="input-shell" value={form.emergency_contact_phone} onChange={(e) => updateField('emergency_contact_phone', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label-shell">Thông tin xe</label>
              <input className="input-shell" value={form.vehicle_info} onChange={(e) => updateField('vehicle_info', e.target.value)} />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="ghost-btn rounded-[24px] px-6 py-3">
              Hủy
            </button>
            <button disabled={isSaving} className="primary-btn rounded-[24px] px-6 py-3 disabled:cursor-not-allowed disabled:opacity-70">
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>

        <form onSubmit={onPasswordSubmit} className="card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">Đổi mật khẩu</h2>
              <p className="mt-2 text-sm text-slate-500">
                Nhập mật khẩu hiện tại để xác nhận. Sau khi đổi thành công, bạn sẽ được yêu cầu đăng nhập lại.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/6 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-900/8">
              <KeyRound size={16} />
              Bảo mật tài khoản
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {passwordMessage ? (
              <AlertBanner
                level={passwordMessageType === 'error' ? 'danger' : 'success'}
                title={passwordMessageType === 'error' ? 'Đổi mật khẩu thất bại' : 'Đổi mật khẩu thành công'}
                description={passwordMessage}
              />
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label-shell">Mật khẩu hiện tại</label>
              <input
                className="input-shell"
                type="password"
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => updatePasswordField('current_password', e.target.value)}
              />
            </div>
            <div>
              <label className="label-shell">Mật khẩu mới</label>
              <input
                className="input-shell"
                type="password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(e) => updatePasswordField('new_password', e.target.value)}
              />
            </div>
            <div>
              <label className="label-shell">Xác nhận mật khẩu mới</label>
              <input
                className="input-shell"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirm_new_password}
                onChange={(e) => updatePasswordField('confirm_new_password', e.target.value)}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-500">
            Mật khẩu mới cần có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetPasswordForm} className="ghost-btn rounded-[24px] px-6 py-3">
              Xóa form
            </button>
            <button
              disabled={isChangingPassword}
              className="primary-btn rounded-[24px] px-6 py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
