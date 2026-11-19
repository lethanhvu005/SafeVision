import base64
import json
from pathlib import Path
from threading import Lock

import cv2
import numpy as np

from ai_engine.mediapipe_hand_tracker import MediaPipeHandTracker
from backend.app.core.config import get_settings


class HandTrackingService:
    def __init__(self) -> None:
        settings = get_settings()
        self.output_path = Path(settings.storage_path) / 'logs' / 'last_hand_tracking_state.json'
        self.tracker = MediaPipeHandTracker(draw_landmarks=False)
        self.lock = Lock()

    def get_last_state(self) -> dict:
        if not self.output_path.exists():
            return {
                'camera_available': False,
                'hand_count': 0,
                'landmarks': [],
                'handedness': [],
            }
        return json.loads(self.output_path.read_text(encoding='utf-8'))

    def infer_from_data_url(self, frame_data_url: str) -> dict:
        if ',' not in frame_data_url:
            raise ValueError('Dữ liệu ảnh hand tracking không hợp lệ')

        _, encoded = frame_data_url.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError('Không giải mã được ảnh từ hand tracking')

        with self.lock:
            result = self.tracker.process_frame(frame, draw=False)
            state = {
                'camera_available': True,
                'hand_count': int(result.get('hand_count', 0) or 0),
                'landmarks': result.get('landmarks', []),
                'handedness': result.get('handedness', []),
            }
            self.output_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
            return state


_service: HandTrackingService | None = None


def get_hand_tracking_service() -> HandTrackingService:
    global _service
    if _service is None:
        _service = HandTrackingService()
    return _service
