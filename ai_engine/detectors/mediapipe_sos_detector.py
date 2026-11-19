from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from time import monotonic
from typing import Any

from ai_engine.mediapipe_hand_tracker import MediaPipeHandTracker


@dataclass(slots=True)
class MediaPipeSosResult:
    label: str
    score: float
    elapsed_seconds: float
    bbox: tuple[float, float, float, float] | None
    stage: int
    sos_triggered: bool
    handedness: str = 'Unknown'


class MediaPipeSosDetector:
    def __init__(self, sequence_timeout_seconds: float = 3.0, lightweight: bool = False):
        self.sequence_timeout_seconds = sequence_timeout_seconds
        self.current_stage = 0
        self.sequence_started_at: float | None = None
        self.active_handedness: str | None = None
        self.tracker_error: str | None = None

        try:
            # MediaPipe handedness is most stable on selfie-style frames, which
            # matches the webcam usage pattern from the standalone detector samples.
            self.tracker = MediaPipeHandTracker(draw_landmarks=False, flip_for_selfie_view=True, model_complexity=0 if lightweight else 1)
        except RuntimeError as exc:
            self.tracker = None
            self.tracker_error = str(exc)
    
    def _reset_sequence(self) -> None:
        self.current_stage = 0
        self.sequence_started_at = None
        self.active_handedness = None

    @staticmethod
    def _group_landmarks_by_hand(
        landmarks: list[dict[str, Any]],
    ) -> dict[int, list[dict[str, Any]]]:
        grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for point in landmarks:
            grouped[int(point['hand_index'])].append(point)
        return grouped

    @staticmethod
    def _handedness_map(handedness_items: list[dict[str, Any]]) -> dict[int, str]:
        return {
            int(item['hand_index']): str(item.get('label', 'Unknown'))
            for item in handedness_items
        }

    @staticmethod
    def _points_by_id(landmarks: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        return {int(point['landmark_id']): point for point in landmarks}

    @staticmethod
    def _bbox_from_points(points: dict[int, dict[str, Any]]) -> tuple[float, float, float, float] | None:
        xs = [float(point['pixel_x']) for point in points.values()]
        ys = [float(point['pixel_y']) for point in points.values()]
        if not xs or not ys:
            return None
        return (min(xs), min(ys), max(xs), max(ys))
    # mở ra
    @staticmethod
    def _finger_is_open(points: dict[int, dict[str, Any]], tip_id: int, pip_id: int) -> bool:
        return float(points[tip_id]['y']) < float(points[pip_id]['y'])
    # gấp lại
    @staticmethod
    def _finger_is_folded(points: dict[int, dict[str, Any]], tip_id: int, pip_id: int) -> bool:
        return float(points[tip_id]['y']) > float(points[pip_id]['y'])
    # ngón cái
    @staticmethod
    def _thumb_is_open(points: dict[int, dict[str, Any]], handedness: str) -> bool:
        tip_x = float(points[4]['x'])
        ip_x = float(points[3]['x'])
        mcp_x = float(points[2]['x'])
        if handedness.lower() == 'left':
            return tip_x > ip_x > mcp_x
        return tip_x < ip_x < mcp_x

    @staticmethod
    def _thumb_is_folded(points: dict[int, dict[str, Any]], handedness: str) -> bool:
        tip_x = float(points[4]['x'])
        ip_x = float(points[3]['x'])
        mcp_x = float(points[2]['x'])
        if handedness.lower() == 'left':
            return tip_x < ip_x < mcp_x
        return tip_x > ip_x > mcp_x
    # trạng thái đầu cả 5
    @classmethod
    def _stage1(cls, points: dict[int, dict[str, Any]], handedness: str) -> bool:
        return (
            cls._thumb_is_open(points, handedness)
            and cls._finger_is_open(points, 8, 6)
            and cls._finger_is_open(points, 12, 10)
            and cls._finger_is_open(points, 16, 14)
            and cls._finger_is_open(points, 20, 18)
        )

    @classmethod
    def _stage2(cls, points: dict[int, dict[str, Any]], handedness: str) -> bool:
        return (
            cls._thumb_is_folded(points, handedness)
            and cls._finger_is_open(points, 8, 6)
            and cls._finger_is_open(points, 12, 10)
            and cls._finger_is_open(points, 16, 14)
            and cls._finger_is_open(points, 20, 18)
        )

    @classmethod
    def _stage3(cls, points: dict[int, dict[str, Any]], handedness: str) -> bool:
        return (
            cls._thumb_is_folded(points, handedness)
            and cls._finger_is_folded(points, 8, 6)
            and cls._finger_is_folded(points, 12, 10)
            and cls._finger_is_folded(points, 16, 14)
            and cls._finger_is_folded(points, 20, 18)
        )

    @staticmethod
    def _stage_label(stage: int, triggered: bool = False) -> str:
        if triggered:
            return 'sos_detection'
        return {
            0: 'no_sos',
            1: 'stage_1_all_fingers_open',
            2: 'stage_2_thumb_folded',
            3: 'stage_3_fingers_cover_thumb',
        }.get(stage, 'no_sos')

    @staticmethod
    def _stage_score(stage: int, triggered: bool = False) -> float:
        if triggered:
            return 1.0
        return {
            0: 0.0,
            1: 0.25,
            2: 0.5,
            3: 0.75,
        }.get(stage, 0.0)

    def _build_result(
        self,
        *,
        stage: int,
        bbox: tuple[float, float, float, float] | None,
        handedness: str,
        now: float,
        triggered: bool = False,
    ) -> MediaPipeSosResult:
        elapsed_seconds = (
            max(0.0, now - self.sequence_started_at)
            if self.sequence_started_at is not None
            else 0.0
        )
        return MediaPipeSosResult(
            label=self._stage_label(stage, triggered=triggered),
            score=self._stage_score(stage, triggered=triggered),
            elapsed_seconds=round(elapsed_seconds, 2),
            bbox=bbox,
            stage=stage,
            sos_triggered=triggered,
            handedness=handedness,
        )

    def detect_stage_signal(
        self,
        landmarks: list[dict[str, Any]],
        handedness: str,
        now: float | None = None,
    ) -> MediaPipeSosResult:
        now = monotonic() if now is None else now
        points = self._points_by_id(landmarks)
        bbox = self._bbox_from_points(points)

        if len(points) < 21:
            if self.sequence_started_at is not None and now - self.sequence_started_at > self.sequence_timeout_seconds:
                self._reset_sequence()
            return self._build_result(stage=self.current_stage, bbox=bbox, handedness=handedness, now=now)

        if (
            self.sequence_started_at is not None
            and now - self.sequence_started_at > self.sequence_timeout_seconds
        ):
            self._reset_sequence()

        if self.current_stage > 0 and self.active_handedness and handedness != self.active_handedness:
            return self._build_result(stage=self.current_stage, bbox=bbox, handedness=handedness, now=now)

        if self.current_stage == 0 and self._stage1(points, handedness):
            self.current_stage = 1
            self.active_handedness = handedness
            return self._build_result(stage=1, bbox=bbox, handedness=handedness, now=now)

        if self.current_stage == 1 and self._stage2(points, handedness):
            self.current_stage = 2
            self.sequence_started_at = now
            self.active_handedness = handedness
            return self._build_result(stage=2, bbox=bbox, handedness=handedness, now=now)

        if self.current_stage == 2 and self._stage3(points, handedness):
            self.current_stage = 3
            return self._build_result(stage=3, bbox=bbox, handedness=handedness, now=now)

        if self.current_stage == 3 and self._stage2(points, handedness):
            elapsed_seconds = now - self.sequence_started_at if self.sequence_started_at is not None else 99.0
            triggered = elapsed_seconds < self.sequence_timeout_seconds
            self._reset_sequence()
            if triggered:
                return MediaPipeSosResult(
                    label='sos_detection',
                    score=1.0,
                    elapsed_seconds=round(elapsed_seconds, 2),
                    bbox=bbox,
                    stage=4,
                    sos_triggered=True,
                    handedness=handedness,
                )

        return self._build_result(stage=self.current_stage, bbox=bbox, handedness=handedness, now=now)

    def predict(self, frame) -> MediaPipeSosResult:
        if self.tracker is None:
            return MediaPipeSosResult(
                label='no_sos',
                score=0.0,
                elapsed_seconds=0.0,
                bbox=None,
                stage=0,
                sos_triggered=False,
                handedness='Unknown',
            )

        tracking_result = self.tracker.process_frame(frame, draw=False)
        grouped_landmarks = self._group_landmarks_by_hand(tracking_result.get('landmarks', []))
        handedness_map = self._handedness_map(tracking_result.get('handedness', []))
        now = monotonic()

        if not grouped_landmarks:
            if (
                self.sequence_started_at is not None
                and now - self.sequence_started_at > self.sequence_timeout_seconds
            ):
                self._reset_sequence()
            return self._build_result(stage=self.current_stage, bbox=None, handedness='Unknown', now=now)

        preferred_hand_index = None
        for hand_index, hand_label in handedness_map.items():
            if hand_label == 'Right':
                preferred_hand_index = hand_index
                break

        if preferred_hand_index is None:
            preferred_hand_index = sorted(grouped_landmarks.keys())[0]

        landmarks = grouped_landmarks[preferred_hand_index]
        handedness = handedness_map.get(preferred_hand_index, 'Unknown')
        return self.detect_stage_signal(landmarks, handedness=handedness, now=now)
