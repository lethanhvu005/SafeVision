import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CarFront,
  CircleUserRound,
  ContactRound,
  FileBadge2,
  Mail,
  Phone,
  ShieldPlus,
} from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { getApiErrorMessage } from '../../utils/apiError';

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
  cccd: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vehicle_info: string;
  auto_send_enabled: boolean;
}

const initialForm: RegisterForm = {
  full_name: '',
  email: '',
  password: '',
  cccd: '',
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  vehicle_info: '',
  auto_send_enabled: false,
};

function extractErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Đăng ký thất bại. Kiểm tra lại thông tin.');
}

function validateRegisterForm(form: RegisterForm) {
  if (!/[A-Z]/.test(form.password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ hoa.';
  }
  if (!/[a-z]/.test(form.password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ thường.';
  }
  if (!/[0-9]/.test(form.password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ số.';
  }
  if (!/[^A-Za-z0-9]/.test(form.password)) {
    return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt.';
  }
  if (!/^[0-9+]{6,20}$/.test(form.cccd.trim())) {
    return 'CCCD chỉ được chứa chữ số hoặc dấu +, độ dài từ 6 đến 20 ký tự.';
  }
  if (!/^[0-9+]{6,20}$/.test(form.phone.trim())) {
    return 'Số điện thoại chỉ được chứa chữ số hoặc dấu +, độ dài từ 6 đến 20 ký tự.';
  }
  if (!/^[0-9+]{6,20}$/.test(form.emergency_contact_phone.trim())) {
    return 'Số điện thoại khẩn cấp chỉ được chứa chữ số hoặc dấu +, độ dài từ 6 đến 20 ký tự.';
  }
  return null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const normalizedForm: RegisterForm = {
      ...form,
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      cccd: form.cccd.trim(),
      phone: form.phone.trim(),
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      vehicle_info: form.vehicle_info.trim(),
    };

    const validationError = validateRegisterForm(normalizedForm);
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/auth/register', normalizedForm);
      setSuccess('Đăng ký thành công. Hệ thống sẽ chuyển sang trang đăng nhập.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-start gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="space-y-6">
          <div className="card overflow-hidden p-6 md:p-8">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,#07111f_0%,#10213f_100%)] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-300">TẠO TÀI KHOẢN NGƯỜI LÁI</p>
                  <h1 className="mt-3 font-display text-4xl font-semibold">Khởi tạo hồ sơ tài xế</h1>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">
                    Hoàn thiện thông tin cơ bản để hệ thống có thể theo dõi buồn ngủ, ghi nhận vị trí và gửi SOS khi cần thiết.
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
                  <ShieldPlus size={28} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {[
                {
                  icon: CircleUserRound,
                  title: 'Thông tin nhận diện',
                  detail: 'Họ tên, CCCD, số điện thoại và email được dùng để xác định tài xế.',
                },
                {
                  icon: ContactRound,
                  title: 'Liên hệ khẩn cấp',
                  detail: 'Hệ thống ưu tiên gửi cảnh báo tới số liên hệ khẩn cấp khi có sự cố.',
                },
                {
                  icon: CarFront,
                  title: 'Thông tin phương tiện',
                  detail: 'Giúp đội vận hành và người nhận SOS xác định đúng phương tiện đang gặp vấn đề.',
                },
              ].map((item) => (
                <article key={item.title} className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <item.icon size={22} />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <form onSubmit={onSubmit} className="card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-semibold text-ink">Đăng ký tài khoản</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Biểu mẫu tối ưu cho desktop và mobile, các trường được chia gọn để nhập nhanh.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/6 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-900/8">
                <FileBadge2 size={16} />
                Hồ sơ người lái
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {error ? (
                <AlertBanner level="danger" title="Không thể tạo tài khoản" description={error} />
              ) : null}
              {success ? (
                <AlertBanner level="success" title="Đăng ký thành công" description={success} />
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-shell">Họ tên</label>
                <div className="relative">
                  <CircleUserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-shell pl-14" placeholder="Nguyễn Văn A" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label-shell">Email</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-shell pl-14" placeholder="driver@example.com" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label-shell">Mật khẩu</label>
                <input className="input-shell" placeholder="Tối thiểu 8 ký tự" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} minLength={8} required />
                <p className="mt-2 text-xs text-slate-500">Cần có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
              </div>
              <div>
                <label className="label-shell">CCCD</label>
                <input className="input-shell" placeholder="Nhập số CCCD" value={form.cccd} onChange={(e) => updateField('cccd', e.target.value)} inputMode="numeric" required />
              </div>
              <div>
                <label className="label-shell">Số điện thoại</label>
                <div className="relative">
                  <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-shell pl-14" placeholder="09xxxxxxxx" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} inputMode="numeric" required />
                </div>
              </div>
              <div>
                <label className="label-shell">Thông tin xe</label>
                <div className="relative">
                  <CarFront size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-shell pl-14" placeholder="Biển số, loại xe..." value={form.vehicle_info} onChange={(e) => updateField('vehicle_info', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-shell">Người liên hệ khẩn cấp</label>
                <input className="input-shell" placeholder="Họ tên người liên hệ" value={form.emergency_contact_name} onChange={(e) => updateField('emergency_contact_name', e.target.value)} required />
              </div>
              <div>
                <label className="label-shell">Số điện thoại khẩn cấp</label>
                <input className="input-shell" placeholder="09xxxxxxxx" value={form.emergency_contact_phone} onChange={(e) => updateField('emergency_contact_phone', e.target.value)} inputMode="numeric" required />
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">
              <input type="checkbox" checked={form.auto_send_enabled} onChange={(e) => updateField('auto_send_enabled', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-ink" />
              Tự động gửi SOS khi hệ thống xác nhận tình huống khẩn cấp.
            </label>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Link to="/login" className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">
                Quay lại đăng nhập
              </Link>
              <button disabled={isSubmitting} className="primary-btn rounded-[24px] px-7 py-4 text-base disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
