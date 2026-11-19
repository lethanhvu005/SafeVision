import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from time import monotonic

import cv2
import numpy as np
from sqlalchemy.orm import Session

from ai_engine.runtime.frame_processor import FrameProcessor
from backend.app.core.config import get_settings
from backend.app.models.drowsiness_event import DrowsinessEvent


class AiInferenceService:
    def __init__(self) -> None:
        settings = get_settings()
        self.output_path = Path(settings.storage_path) / 'logs' / 'last_ai_state.json'
        self.processor = FrameProcessor(settings.sos_model_path, low_memory=settings.ai_low_memory)
        self.lock = Lock()
        self.last_logged_state: dict[int, dict[str, float | int]] = {}

    def infer_from_data_url(self, frame_data_url: str, db: Session | None = None, user_id: int | None = None) -> dict:
        if ',' not in frame_data_url:
            raise ValueError('Dữ liệu ảnh không hợp lệ')

        _, encoded = frame_data_url.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError('Không giải mã được ảnh từ webcam')

        with self.lock:
            result = self.processor.process(frame)
            self.output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            if db is not None and user_id is not None:
                self._log_drowsiness_event_if_needed(db, user_id, result)
            return result

    def _log_drowsiness_event_if_needed(self, db: Session, user_id: int, result: dict) -> None:
        level = int(result.get('drowsiness_level', 0) or 0)
        if level < 1:
            return

        now_monotonic = monotonic()
        state = self.last_logged_state.get(user_id, {'level': 0, 'at': 0.0})
        last_level = int(state['level'])
        last_at = float(state['at'])
        cooldown_seconds = 12.0

        should_log = last_level == 0 or level > last_level or now_monotonic - last_at >= cooldown_seconds
        if not should_log:
            return

        event = DrowsinessEvent(
            user_id=user_id,
            event_time=datetime.now(timezone.utc),
            ear_value=float(result.get('ear', 0.0) or 0.0),
            mar_value=float(result.get('mar', 0.0) or 0.0),
            head_value=float(result.get('head_pitch', 0.0) or 0.0),
            drowsiness_level=level,
            alert_triggered=level >= 1,
            meta_json=json.dumps(
                {
                    'reason': result.get('reason'),
                    'face_detected': result.get('face_detected', False),
                    'sos_score': result.get('sos_score', 0.0),
                    'source': 'frontend_webcam_realtime',
                },
                ensure_ascii=False,
            ),
        )
        db.add(event)
        db.commit()
        self.last_logged_state[user_id] = {'level': level, 'at': now_monotonic}


_service: AiInferenceService | None = None
_service_lock = Lock()


def get_ai_inference_service() -> AiInferenceService:
    global _service
    with _service_lock:
        if _service is None:
            _service = AiInferenceService()
    return _service
