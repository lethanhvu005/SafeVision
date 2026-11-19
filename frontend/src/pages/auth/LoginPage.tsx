import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { useAuthStore } from '../../store/auth';
import { getApiErrorMessage } from '../../utils/apiError';

const REMEMBER_LOGIN_KEY = 'remember_login';
const REMEMBER_EMAIL_KEY = 'remember_email';
const REMEMBER_ROLE_KEY = 'remember_role';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_LOGIN_KEY) === 'true';
    if (!remembered) {
      return;
    }

    setRememberLogin(true);
    setEmail(localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '');
    setIsAdmin(localStorage.getItem(REMEMBER_ROLE_KEY) === 'admin');
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isAdmin ? '/admin/auth/login' : '/auth/login';
      const response = await apiClient.post(endpoint, {
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (rememberLogin) {
        localStorage.setItem(REMEMBER_LOGIN_KEY, 'true');
        localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
        localStorage.setItem(REMEMBER_ROLE_KEY, isAdmin ? 'admin' : 'user');
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_ROLE_KEY);
      }

      setAuth(response.data.access_token, response.data.role);
      navigate(isAdmin ? '/app/admin' : '/app');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Đăng nhập thất bại. Kiểm tra lại thông tin.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorLevel =
    error && error.includes('Không kết nối được tới backend') ? 'warning' : 'danger';

  return (
    <div className="login-page px-4 py-8 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="login-story">
          <div className="login-brand"><ShieldCheck size={30} /><span>SafeVision</span></div>
          <span className="login-eyebrow">NGƯỜI BẠN ĐỒNG HÀNH TRÊN MỌI HÀNH TRÌNH</span>
          <h1>An tâm cầm lái.<br /><span>Vững vàng hành trình.</span></h1>
          <p>Theo dõi sự tỉnh táo, nhận cảnh báo sớm và kết nối trợ giúp khi bạn cần. Một nơi để chủ động bảo vệ mỗi chuyến đi.</p>
          <div className="journey-art" aria-hidden="true">
            <div className="journey-road" /><div className="journey-car"><ShieldCheck size={30} /></div>
            <span className="journey-caption">ĐỒNG HÀNH CÙNG BẠN</span>
          </div>
          <div className="login-features">
            <div><ShieldCheck size={20} /><span><strong>Giám sát bằng AI</strong><small>Phân tích dấu hiệu buồn ngủ qua camera</small></span></div>
            <div><Fingerprint size={20} /><span><strong>Trợ giúp khẩn cấp</strong><small>Kích hoạt SOS và lưu lịch sử cảnh báo</small></span></div>
          </div>
        </section>

        <section className="flex justify-center">
          <form onSubmit={onSubmit} className="card login-form w-full max-w-xl overflow-hidden p-6 md:p-8">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,#07111f_0%,#10213f_100%)] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-300">TRUY CẬP HỆ THỐNG</p>
                  <h1 className="mt-3 font-display text-3xl font-semibold">Đăng nhập</h1>
                  <p className="mt-2 text-sm text-slate-300">
                    Sử dụng tài khoản người lái hoặc bật chế độ quản trị viên nếu cần.
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
                  <Fingerprint size={28} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {error ? (
                <AlertBanner
                  level={errorLevel}
                  title="Đăng nhập chưa thành công"
                  description={error}
                />
              ) : null}

              <div>
                <label htmlFor="login-email" className="label-shell">Email</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white/80 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/10">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center text-slate-400">
                    <Mail size={18} />
                  </span>
                  <input
                    className="input-shell min-w-0 !border-0 !bg-transparent !px-0 !py-3 focus:!border-transparent focus:!ring-0"
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="label-shell">Mật khẩu</label>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white/80 transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/10">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center text-slate-400">
                    <KeyRound size={18} />
                  </span>
                  <input
                    className="input-shell min-w-0 !border-0 !bg-transparent !px-0 !py-3 focus:!border-transparent focus:!ring-0"
                    id="login-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-ink"
                  />
                  Đăng nhập quản trị viên
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-ink"
                  />
                  Ghi nhớ email và loại đăng nhập
                </label>
                <p className="text-xs leading-5 text-slate-500">
                  Hệ thống chỉ ghi nhớ email và vai trò, không lưu mật khẩu trên trình duyệt.
                </p>
              </div>

              <button disabled={isSubmitting} aria-busy={isSubmitting} className="primary-btn w-full rounded-[24px] py-4 text-base">
                {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>

              {!isAdmin ? (
                <p className="text-center text-sm text-slate-600">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="font-semibold text-ink underline-offset-4 hover:underline">
                    Đăng ký ngay
                  </Link>
                </p>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
