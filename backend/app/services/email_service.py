from datetime import datetime, timezone
from email.message import EmailMessage
import mimetypes
from pathlib import Path
import smtplib

from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.email_log import EmailLog
from backend.app.services.google_mail import send_google_mail

settings = get_settings()


class EmailService:
    @staticmethod
    def send_email(
        db: Session,
        recipient_email: str,
        subject: str,
        body: str,
        sos_id: int | None = None,
        retry_count: int = 0,
        attachment_paths: list[str] | None = None,
    ) -> EmailLog:
        log = EmailLog(
            sos_id=sos_id,
            recipient_email=recipient_email,
            subject=subject,
            body_preview=body[:4000],
            status='pending',
            retry_count=retry_count,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        try:
            if settings.email_provider == 'smtp' and (not settings.smtp_username or not settings.smtp_password):
                raise RuntimeError('SMTP credentials missing')

            message = EmailMessage()
            message['From'] = settings.smtp_from
            message['To'] = recipient_email
            message['Subject'] = subject
            message.set_content(body)
            for attachment_path in attachment_paths or []:
                file_path = Path(attachment_path)
                if not file_path.exists() or not file_path.is_file():
                    continue
                mime_type, _ = mimetypes.guess_type(file_path.name)
                main_type, sub_type = (mime_type.split('/', 1) if mime_type else ('application', 'octet-stream'))
                with file_path.open('rb') as attachment_file:
                    message.add_attachment(
                        attachment_file.read(),
                        maintype=main_type,
                        subtype=sub_type,
                        filename=file_path.name,
                    )

            if settings.email_provider == 'google_apps_script':
                send_google_mail(settings, message)
            elif settings.email_provider == 'smtp':
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
                    if settings.smtp_use_tls:
                        smtp.starttls()
                    smtp.login(settings.smtp_username, settings.smtp_password)
                    smtp.send_message(message)
            else:
                raise ValueError('EMAIL_PROVIDER không hợp lệ')

            log.status = 'sent'
            log.sent_at = datetime.now(timezone.utc)
            log.error_message = None
        except Exception as exc:  # noqa: BLE001
            log.status = 'failed'
            log.error_message = str(exc)
        db.commit()
        db.refresh(log)
        return log
