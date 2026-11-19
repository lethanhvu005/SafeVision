from datetime import datetime, timezone
import base64
from pathlib import Path

from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.agency import Agency
from backend.app.models.sos_event import SosEvent
from backend.app.models.user import User
from backend.app.services.agency_matcher import AgencyMatcher
from backend.app.services.email_service import EmailService

settings = get_settings()


class SosService:
    @staticmethod
    def build_maps_url(lat: float | None, lon: float | None) -> str | None:
        if lat is None or lon is None:
            return None
        return f'https://maps.google.com/?q={lat},{lon}'

    @staticmethod
    def save_evidence_data_url(user_id: int, evidence_data_url: str | None) -> str | None:
        if not evidence_data_url or ',' not in evidence_data_url:
            return None

        header, encoded = evidence_data_url.split(',', 1)
        extension = 'jpg'
        if 'image/png' in header:
            extension = 'png'
        elif 'image/webp' in header:
            extension = 'webp'

        target_dir = Path(settings.storage_path) / 'evidence'
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = f'user_{user_id}_sos_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")}.{extension}'
        target_path = target_dir / filename
        target_path.write_bytes(base64.b64decode(encoded))
        return str(target_path.as_posix())

    @staticmethod
    def trigger(
        db: Session,
        user: User,
        trigger_type: str,
        latitude: float | None = None,
        longitude: float | None = None,
        address: str | None = None,
        note: str | None = None,
        evidence_path: str | None = None,
        evidence_data_url: str | None = None,
    ) -> SosEvent:
        agencies = db.query(Agency).all()
        agency = AgencyMatcher.match(latitude, longitude, agencies)
        saved_evidence_path = evidence_path or SosService.save_evidence_data_url(user.id, evidence_data_url)
        sos = SosEvent(
            user_id=user.id,
            agency_id=agency.id if agency else None,
            trigger_type=trigger_type,
            status='pending_confirmation',
            event_time=datetime.now(timezone.utc),
            latitude=latitude,
            longitude=longitude,
            address=address,
            maps_url=SosService.build_maps_url(latitude, longitude),
            evidence_path=saved_evidence_path,
            email_status='pending',
            note=note,
        )
        db.add(sos)
        db.commit()
        db.refresh(sos)
        return sos

    @staticmethod
    def confirm(db: Session, sos: SosEvent, confirmed: bool, cancel_reason: str | None = None) -> SosEvent:
        if not confirmed:
            sos.status = 'cancelled'
            sos.cancel_reason = cancel_reason or 'User cancelled'
            db.commit()
            db.refresh(sos)
            return sos

        user = db.query(User).filter(User.id == sos.user_id).first()
        recipient = sos.agency.email if sos.agency else user.email
        subject = f'[SOS] Khẩn cấp từ {user.full_name}'
        body = (
            f'Họ tên: {user.full_name}\n'
            f'CCCD: {user.cccd}\n'
            f'Số điện thoại: {user.phone}\n'
            f'Liên hệ khẩn cấp: {user.emergency_contact_name} - {user.emergency_contact_phone}\n'
            f'Thông tin xe: {user.vehicle_info or "Không có"}\n'
            f'Thời gian: {sos.event_time}\n'
            f'Kiểu kích hoạt: {sos.trigger_type}\n'
            f'Tọa độ: {sos.latitude}, {sos.longitude}\n'
            f'Địa chỉ: {sos.address or "Không có"}\n'
            f'Bản đồ: {sos.maps_url or "Không có"}\n'
            f'Ghi chú: {sos.note or "Không có"}\n'
            f'Ảnh chụp hiện trường: {sos.evidence_path or "Không có"}\n'
        )
        email_log = EmailService.send_email(
            db,
            recipient,
            subject,
            body,
            sos.id,
            attachment_paths=[sos.evidence_path] if sos.evidence_path else None,
        )
        sos.status = 'sent' if email_log.status == 'sent' else 'failed'
        sos.email_status = email_log.status
        db.commit()
        db.refresh(sos)
        return sos
