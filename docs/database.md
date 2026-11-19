# PHAN C. Thiet ke database chi tiet

## 1. Lua chon
- MVP local: SQLite tai `storage/db/driversafe.db`.
- Production/deploy: PostgreSQL qua Docker.

## 2. Schema bang
### `users`
- Purpose: luu ho so nguoi lai.
- Fields: `id`, `full_name`, `email`, `password_hash`, `cccd`, `phone`, `emergency_contact_name`, `emergency_contact_phone`, `vehicle_info`, `avatar_url`, `auto_send_enabled`, `is_active`, `created_at`, `updated_at`.
- Index: `email`, `cccd`, `id`.

### `admins`
- Purpose: tai khoan quan tri.
- Fields: `id`, `username`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Index: `email`, `username`, `id`.

### `settings`
- Purpose: threshold system hoac per-user.
- Fields: `id`, `user_id`, `scope`, `version`, `ear_threshold`, `mar_threshold`, `head_pose_threshold`, `eye_closed_frames_threshold`, `yawn_frames_threshold`, `head_nod_frames_threshold`, `sos_hold_seconds`, `sound_enabled`, `auto_send_enabled`, `email_retry_limit`, `created_at`, `updated_at`.
- Index: `user_id`, `scope`.

### `agencies`
- Purpose: dataset co quan tiep nhan theo vung.
- Fields: `id`, `region_code`, `region_name`, `agency_name`, `email`, `phone`, `lat_min`, `lat_max`, `lon_min`, `lon_max`, `polygon_geojson`, `is_default`, `is_active`, `created_at`, `updated_at`.
- Index: `region_code`, `is_default`, `is_active`.

### `drowsiness_events`
- Purpose: lich su canh bao buon ngu.
- Fields: `id`, `user_id`, `event_time`, `ear_value`, `mar_value`, `head_value`, `drowsiness_level`, `alert_triggered`, `evidence_path`, `meta_json`.
- Index: `user_id`, `event_time`, `drowsiness_level`.

### `sos_events`
- Purpose: su kien SOS.
- Fields: `id`, `user_id`, `agency_id`, `trigger_type`, `status`, `event_time`, `latitude`, `longitude`, `address`, `maps_url`, `evidence_path`, `email_status`, `note`, `cancel_reason`.
- Index: `user_id`, `agency_id`, `event_time`, `status`, `email_status`.

### `email_logs`
- Purpose: log gui email va retry.
- Fields: `id`, `sos_id`, `recipient_email`, `subject`, `body_preview`, `status`, `retry_count`, `error_message`, `sent_at`, `created_at`.
- Index: `sos_id`, `status`, `created_at`.

### `audit_logs`
- Purpose: luu thao tac admin.
- Fields: `id`, `admin_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `ip_address`, `created_at`.
- Index: `admin_id`, `entity_type`, `created_at`.

### `system_logs`
- Purpose: log loi va thong tin service.
- Fields: `id`, `service_name`, `log_level`, `message`, `stack_trace`, `created_at`.
- Index: `service_name`, `log_level`, `created_at`.

## 3. Quan he
- `users` 1-1 `settings` voi scope user.
- `users` 1-n `drowsiness_events`.
- `users` 1-n `sos_events`.
- `agencies` 1-n `sos_events`.
- `sos_events` 1-n `email_logs`.
- `admins` 1-n `audit_logs`.

## 4. Migration goi y
- Phase 1: tao cac bang core `users`, `admins`, `settings`, `agencies`.
- Phase 2: them bang su kien `drowsiness_events`, `sos_events`, `email_logs`.
- Phase 3: them `audit_logs`, `system_logs`, policy luu tru evidence.
- Alembic command:
  - `alembic init backend/alembic`
  - `alembic revision --autogenerate -m "init schema"`
  - `alembic upgrade head`
