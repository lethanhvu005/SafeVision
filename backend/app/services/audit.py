from datetime import datetime, timezone
import json

from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    def log(
        db: Session,
        admin_id: int | None,
        action: str,
        entity_type: str,
        entity_id: str,
        new_value: dict | None = None,
        old_value: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        log = AuditLog(
            admin_id=admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=json.dumps(old_value, ensure_ascii=True) if old_value else None,
            new_value=json.dumps(new_value, ensure_ascii=True) if new_value else None,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
