from types import SimpleNamespace

from backend.app.core.deps import get_current_user


class _FakeHandTrackingService:
    def get_last_state(self):
        return {
            'camera_available': True,
            'hand_count': 1,
            'landmarks': [
                {
                    'hand_index': 0,
                    'landmark_id': 0,
                    'x': 0.1,
                    'y': 0.2,
                    'z': -0.01,
                    'pixel_x': 32,
                    'pixel_y': 48,
                }
            ],
            'handedness': [{'hand_index': 0, 'label': 'Right', 'score': 0.98}],
        }

    def infer_from_data_url(self, frame_data_url: str):
        return self.get_last_state()


def test_hand_tracking_state(client, monkeypatch):
    from backend.app.api.routes import hand_tracking
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    monkeypatch.setattr(hand_tracking, 'get_hand_tracking_service', lambda: _FakeHandTrackingService())

    response = client.get('/api/v1/hand-tracking/state')

    assert response.status_code == 200
    payload = response.json()
    assert payload['camera_available'] is True
    assert payload['hand_count'] == 1
    assert payload['landmarks'][0]['landmark_id'] == 0
    assert payload['handedness'][0]['label'] == 'Right'


def test_hand_tracking_infer(client, monkeypatch):
    from backend.app.api.routes import hand_tracking
    from backend.app.main import app

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    monkeypatch.setattr(hand_tracking, 'get_hand_tracking_service', lambda: _FakeHandTrackingService())

    response = client.post(
        '/api/v1/hand-tracking/infer',
        json={'frame_data_url': 'data:image/jpeg;base64,' + ('A' * 120)},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['hand_count'] == 1
    assert len(payload['landmarks']) == 1
    assert payload['landmarks'][0]['pixel_x'] == 32
