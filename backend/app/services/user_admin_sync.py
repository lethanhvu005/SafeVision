from sqlalchemy.orm import Session

from backend.app.models.admin import Admin
from backend.app.models.user import User


def build_admin_username(user: User) -> str:
    prefix = user.email.split('@', 1)[0].replace('.', '_').replace('-', '_')
    return f'{prefix}_{user.id}'


def sync_admin_record(
    db: Session,
    user: User,
    *,
    sync_password_hash: bool = True,
    bump_session_version: bool = False,
) -> None:
    admin = db.query(Admin).filter(Admin.email == user.email).first()
    if user.is_admin:
        if admin is None:
            admin = Admin(
                username=build_admin_username(user),
                full_name=user.full_name,
                email=user.email,
                password_hash=user.password_hash,
                role='admin',
                is_active=user.is_active,
            )
            db.add(admin)
            return

        admin.full_name = user.full_name
        admin.email = user.email
        admin.is_active = user.is_active
        if sync_password_hash:
            admin.password_hash = user.password_hash
            if bump_session_version:
                admin.session_version += 1
        if admin.role not in {'admin', 'super_admin'}:
            admin.role = 'admin'
        return

    if admin is not None and admin.role != 'super_admin':
        admin.is_active = False
