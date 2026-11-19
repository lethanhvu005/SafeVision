# Deploy SafeVision lên Render

Repo có sẵn `render.yaml` để tạo backend Docker và frontend Static Site bằng Blueprint.
Cấu hình mặc định dành cho demo miễn phí, dùng SQLite tạm thời.

## 1. Push mã nguồn

Chạy tại thư mục gốc sau khi kiểm tra danh sách file:

```powershell
git add .gitignore .dockerignore render.yaml README.md docs backend frontend ai_engine docker storage/seeds .env.example setup-build.ps1 docker-compose.yml bestSOS.pt
git diff --cached --stat
git commit -m "chore: configure SafeVision deployment on Render"
git push
```

Không đưa `.env`, môi trường Python, `node_modules`, database hoặc ảnh người dùng lên Git.
Giữ `frontend/package-lock.json`, `storage/seeds/agencies.json` và `bestSOS.pt` trong repo.

## 2. Tạo Blueprint

1. Trên Render, chọn **New → Blueprint**.
2. Kết nối repository và chọn nhánh vừa push.
3. Dùng file `render.yaml` tại thư mục gốc.
4. Nhập hai biến môi trường khi Render yêu cầu:

| Service | Biến | Giá trị ví dụ |
| --- | --- | --- |
| safevision-api | FRONTEND_ORIGIN | `https://safevision-web.onrender.com` |
| safevision-web | VITE_API_BASE_URL | `https://safevision-api.onrender.com/api/v1` |

Các URL trên chỉ là ví dụ. Render có thể thêm hậu tố vào tên miền.
Sau khi tạo dịch vụ, lấy URL thật trên Dashboard và cập nhật hai biến tương ứng.
`FRONTEND_ORIGIN` không có dấu `/` cuối; `VITE_API_BASE_URL` phải kết thúc bằng `/api/v1`.
Deploy lại frontend sau khi đổi biến vì Vite nhúng giá trị vào bản build.

Blueprint tự sinh `SECRET_KEY`. Backend tự khởi tạo dữ liệu demo khi khởi động;
frontend đã có rewrite `/*` về `/index.html` để hỗ trợ React Router.

## 3. Kiểm tra

- Backend `/` trả về JSON tên ứng dụng.
- Backend `/docs` mở được tài liệu API.
- Frontend đăng nhập được bằng tài khoản demo trong README.
- Refresh trang con không trả về 404.
- Cho phép camera trên trình duyệt, kiểm tra tính năng AI và log backend.

Camera được trình duyệt gửi lên API; không chạy `run_engine --camera 0` trên Render.

## Giới hạn và xử lý lỗi

### AI trên gói 512 MB

Blueprint bật `AI_LOW_MEMORY=true`: không import Ultralytics/PyTorch và không tải
`bestSOS.pt`; bỏ bộ xác nhận bàn tay riêng của YOLO, tắt FaceMesh refine landmarks,
và dùng MediaPipe Hands complexity 0 cho SOS. Phát hiện mắt, ngáp, tư thế đầu,
SOS bằng chuỗi cử chỉ MediaPipe và nút SOS thủ công vẫn được giữ.
Endpoint hand-tracking độc lập trả 503 với giải thích để tránh tải thêm một model.
Kết quả `model_sos_label=disabled` biểu thị YOLO bị tắt, không phải mất kết nối.

Sau khi deploy, xác nhận biến `AI_LOW_MEMORY=true` trong Environment và theo dõi RAM
khi bật camera. Đây là cấu hình giảm tải, chưa phải bảo đảm hoạt động dưới 512 MB
trên Render. Chất lượng nhận diện cần kiểm tra lại với camera thực tế.
Local mặc định vẫn chạy đầy đủ; đặt `AI_LOW_MEMORY=false` để bật lại YOLO.

- SQLite, evidence và logs trên gói Free không được lưu bền vững qua restart/deploy.
- AI dùng PyTorch, MediaPipe và OpenCV có thể vượt RAM của gói Free. Nếu log báo hết bộ nhớ,
  cần chọn gói có RAM phù hợp rồi cập nhật `plan` trong Blueprint tương ứng.
- Dịch vụ Free có thể ngủ khi không hoạt động; truy cập backend trước và đợi khởi động
  nếu lần đăng nhập đầu tiên bị timeout.
- Nếu cần lưu dữ liệu lâu dài với SQLite: dùng backend trả phí, gắn disk tại `/var/data`,
  đổi `STORAGE_PATH` thành `/var/data` và `DATABASE_URL` thành
  `sqlite:////var/data/db/driversafe.db` trong Blueprint. Dữ liệu demo vẫn đọc từ `storage/seeds`.
- SMTP chưa được cấu hình trong Blueprint. Gói Free chặn kết nối SMTP thông thường;
  tính năng gửi mail cần phương án email qua HTTPS hoặc dịch vụ phù hợp.
- Tài khoản demo được seed công khai; cấu hình này dành cho demo, không phải triển khai dữ liệu thật.

## Tài liệu Render

- [Blueprint specification](https://render.com/docs/blueprint-spec)
- [Free service limitations](https://render.com/docs/free)
- [Persistent disks](https://render.com/docs/disks)

Cấu hình cần được xác nhận bằng build logs và kiểm tra chức năng trên Render sau khi deploy.
