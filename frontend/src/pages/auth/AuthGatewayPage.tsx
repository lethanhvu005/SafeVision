import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Camera,
  CarFront,
  ShieldCheck,
  Siren,
} from 'lucide-react';

export function AuthGatewayPage() {
  return (
    <div className="relative overflow-hidden px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-60" />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-4 py-2 text-sm font-medium text-sky-700 shadow-panel backdrop-blur">
            <ShieldCheck size={16} />
            Giải pháp AI cho an toàn giao thông
          </div>

          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
              HỆ THỐNG NHẬN DIỆN VÀ CẢNH BÁO BUỒN NGỦ
            </p>
            <h1 className="max-w-4xl font-display text-4xl font-semibold leading-tight text-ink md:text-6xl">
              Driver Safety AI kết hợp giám sát buồn ngủ, camera realtime và tín hiệu SOS khẩn cấp.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Giám sát trạng thái buồn ngủ của tài xế và hỗ trợ gửi tín hiệu SOS khẩn cấp.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/register" className="primary-btn rounded-[24px] px-7 py-4 text-base">
              Đăng ký
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="ghost-btn rounded-[24px] px-7 py-4 text-base">
              Đăng nhập
            </Link>
          </div>

          <p className="text-sm text-slate-500">
            Quản trị viên đăng nhập tại trang đăng nhập thông thường.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Camera,
                title: 'Camera AI',
                detail: 'Phân tích webcam realtime và nhận diện trạng thái lái xe.',
              },
              {
                icon: Activity,
                title: 'Cảnh báo sớm',
                detail: 'Theo dõi EAR, MAR và tư thế đầu để phát hiện nguy cơ.',
              },
              {
                icon: Siren,
                title: 'SOS khẩn cấp',
                detail: 'Gửi vị trí và thông báo ngay khi có tín hiệu SOS.',
              },
            ].map((item) => (
              <article key={item.title} className="card p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <item.icon size={22} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10">
          <div className="card relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.72))]" />
            <div className="relative">
              <div className="rounded-[36px] border border-slate-200 bg-[linear-gradient(160deg,#07111f_0%,#10213f_100%)] p-6 text-white shadow-lift">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-300">
                      AI MONITORING
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold">
                      Trung tâm giám sát tài xế
                    </h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 animate-floaty">
                    <CarFront size={28} />
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                  <div className="surface-grid relative rounded-[28px] border border-white/10 bg-slate-950/50 p-4">
                    <div className="aspect-[4/3] rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-5">
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                            Camera đang bật
                          </span>
                          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
                            SOS sẵn sàng
                          </span>
                        </div>
                        <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/5">
                          <div className="absolute inset-5 rounded-full border border-sky-300/25" />
                          <div className="absolute inset-10 rounded-full border border-emerald-300/20" />
                          <Camera size={58} className="text-sky-200" />
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
                          <div className="rounded-2xl bg-white/5 px-3 py-3">
                            <div className="font-semibold text-white">EAR</div>
                            <div className="mt-1 text-slate-300">0.21</div>
                          </div>
                          <div className="rounded-2xl bg-white/5 px-3 py-3">
                            <div className="font-semibold text-white">MAR</div>
                            <div className="mt-1 text-slate-300">0.58</div>
                          </div>
                          <div className="rounded-2xl bg-white/5 px-3 py-3">
                            <div className="font-semibold text-white">HEAD</div>
                            <div className="mt-1 text-slate-300">11°</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        label: 'Drowsiness',
                        value: 'Cảnh báo nhẹ',
                        tone: 'bg-amber-500/20 text-amber-100',
                      },
                      {
                        label: 'Face Detected',
                        value: 'Đã nhận diện',
                        tone: 'bg-emerald-500/20 text-emerald-100',
                      },
                      {
                        label: 'SOS Gesture',
                        value: 'Không phát hiện',
                        tone: 'bg-slate-100/10 text-slate-100',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-300">
                          {item.label}
                        </div>
                        <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
