from datetime import datetime, timezone
import json
from pathlib import Path

from backend.app.core.database import Base, SessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models.admin import Admin
from backend.app.models.agency import Agency
from backend.app.models.drowsiness_event import DrowsinessEvent
from backend.app.models.setting import Setting
from backend.app.models.sos_event import SosEvent
from backend.app.models.system_log import SystemLog
from backend.app.models.user import User
from backend.app.services.settings_service import SettingsService


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(Admin).first():
            db.add_all([
                Admin(username='superadmin', full_name='System Super Admin', email='superadmin@driversafe.local', password_hash=get_password_hash('Admin@123'), role='super_admin'),
                Admin(username='admin', full_name='Operations Admin', email='admin@driversafe.local', password_hash=get_password_hash('Admin@123'), role='admin'),
            ])
            db.commit()

        if not db.query(User).first():
            users = [
                User(full_name='Nguyen Van A', email='driver1@example.com', password_hash=get_password_hash('Driver@123'), cccd='079123456789', phone='0901000001', emergency_contact_name='Tran Thi B', emergency_contact_phone='0902000002', vehicle_info='Toyota Vios 51H-12345', auto_send_enabled=True, is_admin=False),
                User(full_name='Le Thi C', email='driver2@example.com', password_hash=get_password_hash('Driver@123'), cccd='079123456790', phone='0901000003', emergency_contact_name='Pham Van D', emergency_contact_phone='0902000004', vehicle_info='Hyundai Accent 43A-67890', auto_send_enabled=False, is_admin=False),
            ]
            db.add_all(users)
            db.commit()
            for user in users:
                SettingsService.get_or_create_user_settings(db, user.id)

        if not db.query(Agency).first():
            seed_path = Path('storage/seeds/agencies.json')
            agencies = json.loads(seed_path.read_text(encoding='utf-8'))
            for agency in agencies:
                db.add(Agency(**agency))
            db.commit()

        if not db.query(Setting).filter(Setting.scope == 'system').first():
            SettingsService.get_system_settings(db)

        if not db.query(DrowsinessEvent).first():
            user = db.query(User).first()
            db.add_all([
                DrowsinessEvent(user_id=user.id, event_time=datetime.now(timezone.utc), ear_value=0.19, mar_value=0.42, head_value=7.5, drowsiness_level=1, alert_triggered=False, evidence_path='storage/evidence/sample_drowsy_1.jpg', meta_json='{"source":"seed"}'),
                DrowsinessEvent(user_id=user.id, event_time=datetime.now(timezone.utc), ear_value=0.15, mar_value=0.71, head_value=19.0, drowsiness_level=3, alert_triggered=True, evidence_path='storage/evidence/sample_drowsy_2.jpg', meta_json='{"source":"seed"}'),
            ])
            db.commit()

        if not db.query(SosEvent).first():
            user = db.query(User).first()
            agency = db.query(Agency).filter(Agency.is_default.is_(True)).first()
            db.add(SosEvent(user_id=user.id, agency_id=agency.id if agency else None, trigger_type='button', status='failed', event_time=datetime.now(timezone.utc), latitude=10.776889, longitude=106.700806, address='Quan 1, TP.HCM', maps_url='https://maps.google.com/?q=10.776889,106.700806', evidence_path='storage/evidence/sample_sos.jpg', email_status='failed', note='Seed event for admin dashboard'))
            db.commit()

        if not db.query(SystemLog).first():
            db.add(SystemLog(service_name='backend', log_level='INFO', message='Database seeded successfully', created_at=datetime.now(timezone.utc)))
            db.commit()
    finally:
        db.close()


if __name__ == '__main__':
    seed()
