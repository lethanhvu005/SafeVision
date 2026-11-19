import cv2

from ai_engine.safe_mediapipe import load_mediapipe

mp, _MEDIAPIPE_IMPORT_ERROR, _MEDIAPIPE_IMPORT_NOTE = load_mediapipe()
if mp is not None:
    try:
        FaceMesh = mp.solutions.face_mesh.FaceMesh  # type: ignore[attr-defined]
        FACE_MESH_IMPORT_ERROR = None
    except Exception as exc:  # noqa: BLE001
        FaceMesh = None
        FACE_MESH_IMPORT_ERROR = str(exc)
else:
    FaceMesh = None
    FACE_MESH_IMPORT_ERROR = str(_MEDIAPIPE_IMPORT_ERROR) if _MEDIAPIPE_IMPORT_ERROR else _MEDIAPIPE_IMPORT_NOTE

from ai_engine.detectors.eye_detector import EyeDetector
from ai_engine.detectors.fusion_engine import DrowsinessRuleEngine, FrameMetrics, RuleThresholds
from ai_engine.detectors.hand_sos_detector import HandSosDetector
from ai_engine.detectors.head_pose_detector import HeadPoseDetector
from ai_engine.detectors.mediapipe_sos_detector import MediaPipeSosDetector
from ai_engine.detectors.yawn_detector import YawnDetector


class FrameProcessor:
    def __init__(self, sos_model_path: str, low_memory: bool = False):
        self.face_mesh = FaceMesh(max_num_faces=1, refine_landmarks=not low_memory) if FaceMesh else None
        self.face_mesh_error = FACE_MESH_IMPORT_ERROR
        self.eye_detector = EyeDetector()
        self.yawn_detector = YawnDetector()
        self.head_detector = HeadPoseDetector()
        self.hand_detector = HandSosDetector(sos_model_path, enabled=not low_memory)
        self.mediapipe_sos_detector = MediaPipeSosDetector(lightweight=low_memory)
        self.rule_engine = DrowsinessRuleEngine(RuleThresholds())

    @staticmethod
    def _normalize_bbox(
        bbox: tuple[float, float, float, float] | None,
        frame_width: int,
        frame_height: int,
    ) -> dict[str, float] | None:
        if bbox is None or frame_width <= 0 or frame_height <= 0:
            return None

        x1, y1, x2, y2 = bbox
        x1 = max(0.0, min(x1, frame_width))
        y1 = max(0.0, min(y1, frame_height))
        x2 = max(0.0, min(x2, frame_width))
        y2 = max(0.0, min(y2, frame_height))

        width = max(0.0, x2 - x1)
        height = max(0.0, y2 - y1)
        if width <= 0 or height <= 0:
            return None

        return {
            'x': round(x1 / frame_width, 4),
            'y': round(y1 / frame_height, 4),
            'width': round(width / frame_width, 4),
            'height': round(height / frame_height, 4),
        }

    @staticmethod
    def _is_positive_model_signal(label: str, score: float, threshold: float) -> bool:
        return label in {'s', 'o'} and score >= threshold

    def _build_sos_payload(
        self,
        *,
        model_result,
        mediapipe_result,
        frame_width: int,
        frame_height: int,
    ) -> dict:
        model_positive = self._is_positive_model_signal(
            model_result.label,
            model_result.score,
            self.hand_detector.confidence_threshold,
        )

        if model_positive and mediapipe_result.sos_triggered:
            sos_source = 'model+mediapipe'
        elif model_positive:
            sos_source = 'model'
        elif mediapipe_result.stage > 0 or mediapipe_result.sos_triggered:
            sos_source = 'mediapipe'
        else:
            sos_source = 'none'

        return {
            'sos_score': round(model_result.score, 4),
            'hand_landmarks': self.mediapipe_sos_detector.last_landmarks,
            'frame_width': frame_width,
            'frame_height': frame_height,
            'sos_label': model_result.label,
            'sos_stable_seconds': round(model_result.stable_seconds, 2),
            'sos_bbox': self._normalize_bbox(model_result.bbox, frame_width, frame_height),
            'sos_source': sos_source,
            'mediapipe_sos_label': mediapipe_result.label,
            'mediapipe_sos_score': round(mediapipe_result.score, 4),
            'mediapipe_sos_stable_seconds': round(mediapipe_result.elapsed_seconds, 2),
            'mediapipe_sos_bbox': self._normalize_bbox(mediapipe_result.bbox, frame_width, frame_height),
            'mediapipe_sos_stage': mediapipe_result.stage,
            'mediapipe_sos_triggered': mediapipe_result.sos_triggered,
            'model_sos_label': model_result.label,
            'model_sos_score': round(model_result.score, 4),
            'model_sos_stable_seconds': round(model_result.stable_seconds, 2),
            'model_sos_bbox': self._normalize_bbox(model_result.bbox, frame_width, frame_height),
        }

    def process(self, frame):
        model_sos_result = self.hand_detector.predict(frame)
        mediapipe_sos_result = self.mediapipe_sos_detector.predict(frame)
        frame_height, frame_width = frame.shape[:2]
        sos_payload = self._build_sos_payload(
            model_result=model_sos_result,
            mediapipe_result=mediapipe_sos_result,
            frame_width=frame_width,
            frame_height=frame_height,
        )

        if self.face_mesh is None:
            state = self.rule_engine.update(
                FrameMetrics(
                    ear=1.0,
                    mar=0.0,
                    head_pitch=0.0,
                    sos_score=model_sos_result.score,
                    sos_stable_seconds=model_sos_result.stable_seconds,
                )
            )
            return {
                'ear': 0.0,
                'mar': 0.0,
                'head_pitch': 0.0,
                **sos_payload,
                'drowsiness_level': state.level,
                'reason': f'thieu MediaPipe FaceMesh: {self.face_mesh_error}',
                'sos_triggered': state.sos_triggered or mediapipe_sos_result.sos_triggered,
                'camera_available': True,
                'face_detected': False,
            }

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            state = self.rule_engine.update(
                FrameMetrics(
                    ear=1.0,
                    mar=0.0,
                    head_pitch=0.0,
                    sos_score=model_sos_result.score,
                    sos_stable_seconds=model_sos_result.stable_seconds,
                )
            )
            return {
                'ear': 0.0,
                'mar': 0.0,
                'head_pitch': 0.0,
                **sos_payload,
                'drowsiness_level': state.level,
                'reason': 'chua nhan dien duoc khuon mat',
                'sos_triggered': state.sos_triggered or mediapipe_sos_result.sos_triggered,
                'camera_available': True,
                'face_detected': False,
            }

        face = results.multi_face_landmarks[0]
        h, w, _ = frame.shape
        coords = [(int(point.x * w), int(point.y * h)) for point in face.landmark]
        ear = self.eye_detector.detect(coords)
        mar = self.yawn_detector.detect(coords)
        head_pitch = self.head_detector.detect_pitch(coords)
        state = self.rule_engine.update(
            FrameMetrics(
                ear=ear,
                mar=mar,
                head_pitch=head_pitch,
                sos_score=model_sos_result.score,
                sos_stable_seconds=model_sos_result.stable_seconds,
            )
        )
        return {
            'ear': round(ear, 4),
            'mar': round(mar, 4),
            'head_pitch': round(head_pitch, 4),
            **sos_payload,
            'drowsiness_level': state.level,
            'reason': state.reason,
            'sos_triggered': state.sos_triggered or mediapipe_sos_result.sos_triggered,
            'camera_available': True,
            'face_detected': True,
        }

