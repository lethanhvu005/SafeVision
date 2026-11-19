import { createBrowserRouter } from 'react-router-dom';

import { RequireAdmin, RequireAuth, RequireUser } from './guards';
import { AppShell } from '../layouts/AppShell';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminManagementPage } from '../pages/admin/AdminManagementPage';
import { AuthGatewayPage } from '../pages/auth/AuthGatewayPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/user/DashboardPage';
import { HistoryPage } from '../pages/user/HistoryPage';
import { ProfilePage } from '../pages/user/ProfilePage';

export const router = createBrowserRouter([
  { path: '/', element: <AuthGatewayPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireUser />,
        children: [
          {
            path: '/app',
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'history', element: <HistoryPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: '/app/admin',
            element: <AppShell />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'manage', element: <AdminManagementPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
