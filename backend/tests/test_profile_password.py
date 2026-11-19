from backend.app.core.security import create_access_token, get_password_hash, verify_password
from backend.app.models.admin import Admin
from backend.app.models.user import User


def _create_user(**overrides) -> User:
    data = {
        'full_name': 'Nguyen Van Test',
        'email': 'driver.test@example.com',
        'password_hash': get_password_hash('Driver@123'),
        'cccd': '079123456799',
        'phone': '0901000099',
        'emergency_contact_name': 'Tran Thi Test',
        'emergency_contact_phone': '0902000099',
        'vehicle_info': 'Toyota Test 51A-99999',
        'auto_send_enabled': False,
        'is_admin': False,
        'is_active': True,
        'session_version': 1,
    }
    data.update(overrides)
    return User(**data)


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id), 'user', user.session_version)
    return {'Authorization': f'Bearer {token}'}


def test_change_password_successfully_updates_hash_and_invalidates_current_token(client, db_session):
    user = _create_user()
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    response = client.put(
        '/api/v1/profile/password',
        json={
            'current_password': 'Driver@123',
            'new_password': 'Driver@456',
            'confirm_new_password': 'Driver@456',
        },
        headers=_auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json()['message'] == 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'

    db_session.refresh(user)
    assert verify_password('Driver@456', user.password_hash) is True
    assert user.session_version == 2

    stale_response = client.get('/api/v1/profile/me', headers=_auth_headers(_create_user(id=user.id, session_version=1)))
    assert stale_response.status_code == 401


def test_change_password_rejects_incorrect_current_password(client, db_session):
    user = _create_user(email='driver.invalid@example.com', cccd='079123456798')
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    response = client.put(
        '/api/v1/profile/password',
        json={
            'current_password': 'Wrong@123',
            'new_password': 'Driver@456',
            'confirm_new_password': 'Driver@456',
        },
        headers=_auth_headers(user),
    )

    assert response.status_code == 400
    assert response.json()['detail'] == 'Mật khẩu hiện tại không đúng'

    db_session.refresh(user)
    assert verify_password('Driver@123', user.password_hash) is True
    assert user.session_version == 1


def test_change_password_syncs_admin_password_when_user_has_admin_role(client, db_session):
    user = _create_user(
        email='driver.admin@example.com',
        cccd='079123456797',
        is_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    admin = Admin(
        username='driver_admin_1',
        full_name=user.full_name,
        email=user.email,
        password_hash=user.password_hash,
        role='admin',
        is_active=True,
        session_version=1,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    response = client.put(
        '/api/v1/profile/password',
        json={
            'current_password': 'Driver@123',
            'new_password': 'Driver@789',
            'confirm_new_password': 'Driver@789',
        },
        headers=_auth_headers(user),
    )

    assert response.status_code == 200

    db_session.refresh(user)
    db_session.refresh(admin)
    assert verify_password('Driver@789', user.password_hash) is True
    assert verify_password('Driver@789', admin.password_hash) is True
    assert admin.session_version == 2
