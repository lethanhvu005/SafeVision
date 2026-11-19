from fastapi import APIRouter

from backend.app.api.admin import agencies as admin_agencies
from backend.app.api.admin import auth as admin_auth
from backend.app.api.admin import dashboard as admin_dashboard
from backend.app.api.admin import logs as admin_logs
from backend.app.api.admin import settings as admin_settings
from backend.app.api.admin import users as admin_users
from backend.app.api.routes import auth, drowsiness, hand_tracking, health, profile, sos

router = APIRouter()
router.include_router(auth.router, prefix='/auth', tags=['auth'])
router.include_router(profile.router, prefix='/profile', tags=['profile'])
router.include_router(drowsiness.router, prefix='/drowsiness', tags=['drowsiness'])
router.include_router(sos.router, prefix='/sos', tags=['sos'])
router.include_router(health.router, tags=['health'])
router.include_router(hand_tracking.router, prefix='/hand-tracking', tags=['hand-tracking'])
router.include_router(admin_auth.router, prefix='/admin/auth', tags=['admin-auth'])
router.include_router(admin_users.router, prefix='/admin/users', tags=['admin-users'])
router.include_router(admin_agencies.router, prefix='/admin/agencies', tags=['admin-agencies'])
router.include_router(admin_settings.router, prefix='/admin/settings', tags=['admin-settings'])
router.include_router(admin_logs.router, prefix='/admin', tags=['admin-logs'])
router.include_router(admin_dashboard.router, prefix='/admin/dashboard', tags=['admin-dashboard'])
