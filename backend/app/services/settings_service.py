from sqlalchemy.orm import Session

from backend.app.models.setting import Setting
from backend.app.schemas.setting import SettingUpdate


class SettingsService:
    SYNC_FIELDS = (
        'ear_threshold',
        'mar_threshold',
        'head_pose_threshold',
        'eye_closed_frames_threshold',
        'yawn_frames_threshold',
        'head_nod_frames_threshold',
        'sos_hold_seconds',
        'sound_enabled',
        'auto_send_enabled',
        'email_retry_limit',
    )

    @staticmethod
    def get_system_settings(db: Session) -> Setting:
        settings = db.query(Setting).filter(Setting.scope == 'system').first()
        if not settings:
            settings = Setting(scope='system')
            db.add(settings)
            db.commit()
            db.refresh(settings)
            return settings

        # Tự động hạ ngưỡng cũ về mức phù hợp với luồng realtime webcam frontend.
        if (
            settings.eye_closed_frames_threshold == 12
            and settings.yawn_frames_threshold == 6
            and settings.head_nod_frames_threshold == 8
        ):
            settings.eye_closed_frames_threshold = 3
            settings.yawn_frames_threshold = 2
            settings.head_nod_frames_threshold = 3
            settings.version += 1
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    @staticmethod
    def sync_user_settings_with_system(db: Session, user_setting: Setting) -> Setting:
        system_settings = SettingsService.get_system_settings(db)
        if user_setting.version >= system_settings.version:
            return user_setting

        for field in SettingsService.SYNC_FIELDS:
            setattr(user_setting, field, getattr(system_settings, field))
        user_setting.version = system_settings.version
        db.add(user_setting)
        db.commit()
        db.refresh(user_setting)
        return user_setting

    @staticmethod
    def get_or_create_user_settings(db: Session, user_id: int) -> Setting:
        settings = db.query(Setting).filter(Setting.user_id == user_id).first()
        if settings:
            return SettingsService.sync_user_settings_with_system(db, settings)

        system_settings = SettingsService.get_system_settings(db)
        settings = Setting(
            user_id=user_id,
            scope='user',
            version=system_settings.version,
            ear_threshold=system_settings.ear_threshold,
            mar_threshold=system_settings.mar_threshold,
            head_pose_threshold=system_settings.head_pose_threshold,
            eye_closed_frames_threshold=system_settings.eye_closed_frames_threshold,
            yawn_frames_threshold=system_settings.yawn_frames_threshold,
            head_nod_frames_threshold=system_settings.head_nod_frames_threshold,
            sos_hold_seconds=system_settings.sos_hold_seconds,
            sound_enabled=system_settings.sound_enabled,
            auto_send_enabled=system_settings.auto_send_enabled,
            email_retry_limit=system_settings.email_retry_limit,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
        return settings

    @staticmethod
    def propagate_system_settings_to_users(db: Session, system_setting: Setting) -> None:
        user_settings = db.query(Setting).filter(Setting.scope == 'user').all()
        for user_setting in user_settings:
            for field in SettingsService.SYNC_FIELDS:
                setattr(user_setting, field, getattr(system_setting, field))
            user_setting.version = system_setting.version
            db.add(user_setting)
        db.commit()

    @staticmethod
    def update_settings(db: Session, setting: Setting, payload: SettingUpdate) -> Setting:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(setting, field, value)
        setting.version += 1
        db.add(setting)
        db.commit()
        db.refresh(setting)

        if setting.scope == 'system':
            SettingsService.propagate_system_settings_to_users(db, setting)
            db.refresh(setting)

        return setting
