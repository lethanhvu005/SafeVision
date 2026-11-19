from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.ai import AiInferRequest
from backend.app.schemas.hand_tracking import HandTrackingResponse
from backend.app.services.hand_tracking import get_hand_tracking_service

router = APIRouter()


@router.get('/state', response_model=HandTrackingResponse)
def get_hand_tracking_state(
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    try:
        service = get_hand_tracking_service()
        return service.get_last_state()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=500, detail='Không đọc được trạng thái hand tracking')


@router.post('/infer', response_model=HandTrackingResponse)
def infer_hand_tracking(
    payload: AiInferRequest,
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    if not payload.frame_data_url.startswith('data:image/'):
        raise HTTPException(status_code=400, detail='Dữ liệu ảnh hand tracking không hợp lệ')
    try:
        service = get_hand_tracking_service()
        return service.infer_from_data_url(payload.frame_data_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=500, detail='Không xử lý được khung hình hand tracking')
