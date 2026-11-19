# PHAN I. Test

## 1. Unit test backend
- `test_health.py`: endpoint health.
- `test_agency_matcher.py`: bbox/default agency matching.
- `test_fusion.py`: rule engine nang level khi co nhieu dau hieu.

## 2. API test
- Dang ky/dang nhap user.
- Dang nhap admin.
- Tao event drowsiness.
- Trigger/confirm SOS.
- CRUD agency, update settings, retry email.

## 3. Test case nghiep vu
- User thieu `full_name` hoac `cccd` thi khong duoc gui SOS.
- SOS huy trong cua so xac nhan thi event -> `cancelled`.
- Khong tim thay agency theo vung thi fallback `DEFAULT`.
- SMTP loi thi `email_logs.status = failed`, admin retry duoc.

## 4. Test AI logic co ban
- EAR < threshold lien tuc -> Level 2.
- MAR > threshold lien tuc -> Level 1.
- Head pose > threshold lien tuc -> Level 3.
- Ket hop 2 dau hieu -> `multi_signal`, Level 3.
- SOS score >= 0.7 va stable >= 3s -> trigger SOS.

## 5. Test luong SOS end-to-end
1. Dang nhap user demo.
2. Upload evidence.
3. Trigger SOS voi lat/lon hop le.
4. Confirm SOS.
5. Kiem tra `sos_events`, `email_logs`, agency match, audit/admin dashboard.
