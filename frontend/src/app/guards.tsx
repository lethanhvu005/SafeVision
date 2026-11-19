import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../store/auth';

export function RequireAuth() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireUser() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin' || role === 'super_admin') {
    return <Navigate to="/app/admin" replace />;
  }

  if (role !== 'user') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin' || role === 'super_admin') {
    return <Outlet />;
  }

  if (role === 'user') {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
