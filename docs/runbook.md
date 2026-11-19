# PHAN J. Huong dan chay project

## 1. Cai dependencies
### Backend
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## 2. Khoi tao database
```bash
python backend/app/db_init.py
```
Database SQLite duoc tao tai `storage/db/driversafe.db`.

## 3. Chay backend
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## 4. Chay frontend
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## 5. Chay AI engine
```bash
python ai_engine/run_engine.py --camera 0 --model-path bestSOS.pt
```
Hoac voi video mau:
```bash
python ai_engine/run_engine.py --camera 7606752149136.mp4
```

## 6. Cau hinh SMTP
Sua `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=your-email@gmail.com
SMTP_USE_TLS=true
```
Khong commit secret vao repo.

## 7. Tai khoan mau
- Super admin: `superadmin@driversafe.local` / `Admin@123`
- Admin: `admin@driversafe.local` / `Admin@123`
- User: `driver1@example.com` / `Driver@123`

## 8. Docker
```bash
docker compose up --build
```
Neu muon dung Postgres, sua `DATABASE_URL` thanh:
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/driversafe
```

## 9. Ghi chu van hanh
- Evidence nam trong `storage/evidence/`.
- Backend log nam trong `storage/logs/backend.log`.
- AI state gan nhat nam trong `storage/logs/last_ai_state.json`.
- Khi can migrate that, dung Alembic theo `docs/database.md`.
