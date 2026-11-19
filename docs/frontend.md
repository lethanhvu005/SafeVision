# PHAN E. Thiet ke frontend

## 1. Man hinh user
- Dang nhap.
- Dashboard realtime.
- Ho so ca nhan.
- Lich su drowsiness.
- Lich su SOS va email.
- Cau hinh canh bao.

## 2. Man hinh admin
- Dang nhap admin.
- Dashboard thong ke.
- Quan ly user.
- Quan ly agency.
- Quan ly settings AI.
- Xem drowsiness events.
- Xem SOS events.
- Xem email logs va retry.
- Xem audit logs, system logs.

## 3. Dieu huong
- `AppShell` lam layout chung.
- React Router chia route user/admin.
- Zustand giu token va role.
- React Query dung cho fetch/cache API.

## 4. Component chinh
- `StatCard`: metric card cho dashboard.
- `MetricBar`: EAR/MAR/head pose.
- `EventTable`: render lich su.
- `LoginPage`: login user/admin.
- `DashboardPage`: webcam frame, SOS button, metrics, lich su gan nhat.

## 5. UX
- Mau nen sand + ink de nhin ro khi demo ban ngay.
- Nut SOS mau do, luon de thay.
- Typography `Space Grotesk` + `IBM Plex Sans` de tach heading/body ro.
- Mobile: layout grid tu dong co lai ve 1 cot.
