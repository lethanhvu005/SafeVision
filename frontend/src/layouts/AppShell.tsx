import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
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
            { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/app/profile', label: 'Hồ sơ', icon: UserRound },
            { to: '/app/history', label: 'Lịch sử', icon: History },
          ],
    [isAdmin],
  );

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen px-4 py-5 md:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="card relative overflow-hidden p-4 md:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),linear-gradient(135deg,#07111f_0%,#10213f_100%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to={isAdmin ? '/app/admin' : '/app'} className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/10 text-white shadow-innerGlass backdrop-blur">
                  <ShieldCheck size={28} />
                </Link>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-300">
                    Driver Safety AI
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-white md:text-3xl">
                    {isAdmin ? 'Trung tâm quản trị hệ thống' : 'Trung tâm giám sát người lái'}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                <nav className="flex flex-wrap items-center gap-2">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/app' || link.to === '/app/admin'}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition',
                          isActive
                            ? 'border-white/30 bg-white/16 text-white'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
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
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-100"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white lg:hidden"
                aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                Vai trò: {isAdmin ? 'Quản trị viên' : 'Tài xế'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                Route hiện tại: {location.pathname}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                Chế độ: realtime monitoring
              </span>
            </div>

            {mobileOpen ? (
              <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.08] p-4 text-white backdrop-blur lg:hidden">
                <nav className="grid gap-2">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/app' || link.to === '/app/admin'}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                          isActive ? 'bg-white/16 text-white' : 'text-slate-200 hover:bg-white/10',
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
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
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
