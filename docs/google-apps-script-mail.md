# Gửi SOS bằng Google Apps Script trên Render Free

## 1. Tạo script

1. Mở https://script.google.com và chọn **New project**.
2. Chép toàn bộ `integrations/google-apps-script/Code.gs` vào file `Code.gs`.
3. Tạo khóa riêng trên máy: `py -c "import secrets; print(secrets.token_urlsafe(48))"`.
4. Trong **Project Settings → Script properties**, thêm `SOS_SHARED_SECRET` bằng khóa vừa tạo.
5. Chọn hàm `authorizeMail`, nhấn **Run** và cấp quyền gửi email. Hàm này chỉ kiểm tra quota, không gửi mail.

## 2. Triển khai

Chọn **Deploy → New deployment → Web app**:

- Execute as: **Me**.
- Who has access: **Anyone** (không yêu cầu đăng nhập Google để backend gọi).
- Nhấn Deploy, sao chép URL kết thúc bằng `/exec`, không dùng `/dev`.

Nếu tài khoản tổ chức không cho chọn Anyone, cần quản trị viên cho phép hoặc dùng tài khoản phù hợp.
Mỗi lần sửa script: Manage deployments → Edit → New version → Deploy.

## 3. Render → safevision-api → Environment

```env
EMAIL_PROVIDER=google_apps_script
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/MA_DEPLOYMENT/exec
GOOGLE_SCRIPT_SECRET=khoa_giong_het_SOS_SHARED_SECRET
```

Save và deploy lại backend sau khi mã nguồn mới đã được push. Không đặt khóa vào frontend,
Git hoặc chat. Không cần Gmail App Password khi dùng provider này.
Email được gửi từ tài khoản Google triển khai script, không phải giá trị SMTP_FROM.

Người nhận vẫn do luồng SOS chọn: email đơn vị hỗ trợ được ghép, hoặc email người dùng
nếu không có đơn vị. Kiểm tra email đơn vị trong trang quản trị: địa chỉ mẫu `example.com`
không phải hộp thư thật. DEFAULT_AGENCY_EMAIL không tự ghi đè các đơn vị đã có trong DB.

## 4. Kiểm tra sau cấu hình

- Mở URL `/exec`: phải nhận JSON `{"ok":true,"service":"SafeVision mail relay"}`.
- Kiểm tra địa chỉ nhận thực tế trước khi bấm SOS.
- Gửi một SOS thử, xem Email logs và hộp thư người nhận (kể cả Spam).
- `sent` nghĩa là MailApp chấp nhận gửi, không đảm bảo đã vào Inbox.
- Nếu timeout, kiểm tra hộp thư trước khi thử lại để tránh email trùng.
- Sai secret, hết quota hoặc thiếu quyền sẽ được ghi vào Email logs dưới trạng thái failed.

Google áp dụng quota email theo tài khoản; xem [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app).
Hướng dẫn deploy: https://developers.google.com/apps-script/guides/web.

## Khung tay

Khung xương xanh dùng MediaPipe chạy tại trình duyệt, tối đa khoảng 20 lần cập nhật/giây,
không chờ lượt gửi ảnh lên Render. Tốc độ thực tế phụ thuộc thiết bị; lần đầu cần tải model
và WASM từ Google/jsDelivr. Nhận diện SOS và buồn ngủ vẫn do backend quyết định.
