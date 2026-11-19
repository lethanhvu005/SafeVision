from backend.app.models.admin import Admin


def can_view_evidence(admin: Admin) -> bool:
    return admin.role in {'admin', 'super_admin'} and admin.is_active


def can_manage_admins(admin: Admin) -> bool:
    return admin.role == 'super_admin'
