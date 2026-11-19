import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { cx } from '../components/ui';
import { useAuthStore } from '../store/auth';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = useMemo(
    () =>
      isAdmin
        ? [
            { to: '/app/admin', label: 'Tổng quan', icon: LayoutDashboard },
            { to: '/app/admin/manage', label: 'Quản trị dữ liệu', icon: Settings2 },
          ]
        : [
            { to: '/app', label: 'Giám sát AI', icon: LayoutDashboard },
            { to: '/app/profile', label: 'Hồ sơ & Cấu hình', icon: UserRound },
            { to: '/app/history', label: 'Lịch sử & Email', icon: History },
          ],
    [isAdmin],
  );

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="card relative overflow-hidden border-slate-800/80 p-4 shadow-panel md:px-6 md:py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_30%),linear-gradient(135deg,#07111f_0%,#0f2342_100%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 md:gap-4">
                <Link
                  to={isAdmin ? '/app/admin' : '/app'}
                  className="group flex h-13 w-13 items-center justify-center rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-500/25 to-sky-500/15 text-teal-300 shadow-innerGlass backdrop-blur transition hover:scale-105 hover:border-teal-300/50"
                >
                  <ShieldCheck size={28} className="transition-transform group-hover:scale-110" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-teal-300/90">
                      SafeVision AI
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Online
                    </span>
                  </div>
                  <h1 className="mt-0.5 font-display text-xl font-bold tracking-tight text-white md:text-2xl">
                    {isAdmin ? 'Trung tâm điều hành & Quản trị' : 'Trung tâm giám sát an toàn tài xế'}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                <nav className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/35 p-1.5 backdrop-blur-md">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/app' || link.to === '/app/admin'}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <link.icon size={16} />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-rose-100"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white lg:hidden"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 font-medium">
                <Activity size={13} className="text-teal-300" />
                Vai trò: <strong className="text-white">{isAdmin ? 'Quản trị viên' : 'Tài xế'}</strong>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 font-medium">
                Màn hình: <strong className="text-white">{links.find((link) => link.to === location.pathname)?.label ?? 'Không gian làm việc'}</strong>
              </span>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-slate-300 sm:inline-flex">
                AI phát hiện buồn ngủ & Cử chỉ khẩn cấp S-O-S
              </span>
            </div>

            {mobileOpen ? (
              <div className="mt-4 rounded-3xl border border-white/15 bg-slate-950/80 p-4 text-white backdrop-blur-xl lg:hidden">
                <nav className="grid gap-1.5">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/app' || link.to === '/app/admin'}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                          isActive
                            ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white'
                            : 'text-slate-200 hover:bg-white/10',
                        )
                      }
                    >
                      <link.icon size={18} />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-100"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
