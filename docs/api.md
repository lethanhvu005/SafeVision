# PHAN D. Thiet ke API day du

## 1. Auth user
### POST `/api/v1/auth/register`
- Auth: khong can.
- Request:
```json
{
  "full_name": "Nguyen Van A",
  "email": "driver1@example.com",
  "password": "Driver@123",
  "cccd": "079123456789",
  "phone": "0901000001",
  "emergency_contact_name": "Tran Thi B",
  "emergency_contact_phone": "0902000002",
  "vehicle_info": "Toyota Vios 51H-12345",
  "auto_send_enabled": true
}
```

### POST `/api/v1/auth/login`
- Auth: khong can.
- Response:
```json
{ "access_token": "jwt", "token_type": "bearer", "role": "user" }
```

## 2. Auth admin
### POST `/api/v1/admin/auth/login`
```json
{ "email": "admin@driversafe.local", "password": "Admin@123" }
```

### GET `/api/v1/admin/auth/profile`
- Auth: admin token.

## 3. User profile va settings
### GET `/api/v1/profile/me`
### PUT `/api/v1/profile/me`
### GET `/api/v1/profile/settings`
### PUT `/api/v1/profile/settings`
- Auth: user.

## 4. Drowsiness
### POST `/api/v1/drowsiness/events`
```json
{
  "ear_value": 0.18,
  "mar_value": 0.62,
  "head_value": 17.2,
  "drowsiness_level": 2,
  "alert_triggered": true,
  "evidence_path": "storage/evidence/frame_001.jpg",
  "meta_json": "{\"reason\":\"eyes_closed\"}"
}
```

### GET `/api/v1/drowsiness/events`
- Auth: user.

## 5. SOS
### POST `/api/v1/sos/trigger`
```json
{
  "trigger_type": "button",
  "latitude": 10.776889,
  "longitude": 106.700806,
  "address": "Quan 1, TP.HCM",
  "note": "Tai nan nhe, can ho tro",
  "evidence_path": "storage/evidence/sos_001.jpg"
}
```

### POST `/api/v1/sos/confirm`
```json
{ "sos_id": 1, "confirmed": true }
```

### GET `/api/v1/sos/history`
### GET `/api/v1/sos/email-history`
### POST `/api/v1/sos/evidence-upload`

## 6. Admin APIs
### Agencies
- `GET /api/v1/admin/agencies`
- `POST /api/v1/admin/agencies`
- `PUT /api/v1/admin/agencies/{id}`
- `DELETE /api/v1/admin/agencies/{id}`

### Settings
- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings`

### Logs
- `GET /api/v1/admin/drowsiness-events`
- `GET /api/v1/admin/sos-events`
- `GET /api/v1/admin/email-logs`
- `POST /api/v1/admin/email-logs/{id}/retry`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/system-logs`

### Dashboard
- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/charts`

## 7. Health
- `GET /api/v1/health`
- `GET /api/v1/version`
