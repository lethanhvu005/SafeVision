from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.ai import AiInferRequest
from backend.app.services.ai_inference import get_ai_inference_service

router = APIRouter()
settings = get_settings()


@router.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/version')
def version() -> dict[str, str]:
    return {'version': '1.0.0', 'timestamp': datetime.now(timezone.utc).isoformat()}


@router.get('/health/ai-state')
def ai_state():
    path = Path(settings.storage_path) / 'logs' / 'last_ai_state.json'
    if not path.exists():
        return {
            'camera_available': False,
            'ear': 0.0,
            'mar': 0.0,
            'head_pitch': 0.0,
            'sos_score': 0.0,
            'sos_source': 'none',
            'sos_label': 'unavailable',
            'sos_stable_seconds': 0.0,
            'drowsiness_level': 0,
            'reason': 'chưa có dữ liệu AI',
            'sos_triggered': False,
            'face_detected': False,
            'mediapipe_sos_label': 'unavailable',
            'mediapipe_sos_score': 0.0,
            'mediapipe_sos_stable_seconds': 0.0,
            'mediapipe_sos_bbox': None,
            'mediapipe_sos_stage': 0,
            'mediapipe_sos_triggered': False,
            'model_sos_label': 'unavailable',
            'model_sos_score': 0.0,
            'model_sos_stable_seconds': 0.0,
            'model_sos_bbox': None,
        }
    return json.loads(path.read_text(encoding='utf-8'))


@router.post('/health/ai-infer')
def ai_infer(
    payload: AiInferRequest,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    if not payload.frame_data_url.startswith('data:image/'):
        raise HTTPException(status_code=400, detail='Dữ liệu ảnh AI không hợp lệ')
    try:
        service = get_ai_inference_service()
        return service.infer_from_data_url(payload.frame_data_url, db=db, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=500, detail='Không xử lý được khung hình AI')
