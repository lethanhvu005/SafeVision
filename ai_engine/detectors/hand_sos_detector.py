from dataclasses import dataclass
from pathlib import Path
from time import monotonic

import cv2

from ai_engine.safe_mediapipe import load_mediapipe

mp, _MEDIAPIPE_IMPORT_ERROR, _MEDIAPIPE_IMPORT_NOTE = load_mediapipe()

try:
    from ultralytics import YOLO
except Exception:  # noqa: BLE001
    YOLO = None


@dataclass(slots=True)
class HandPrediction:
    label: str
    score: float
    stable_seconds: float
    bbox: tuple[float, float, float, float] | None = None


class HandSosDetector:
    def __init__(self, model_path: str, stable_threshold: float = 1.0, confidence_threshold: float = 0.65):
        self.model_path = Path(model_path)
        self.stable_threshold = stable_threshold
        self.confidence_threshold = confidence_threshold
        self.model = YOLO(str(self.model_path)) if YOLO and self.model_path.exists() else None
        self.hands = (
            mp.solutions.hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                model_complexity=0,
                min_detection_confidence=0.45,
                min_tracking_confidence=0.45,
            )
            if mp is not None
            else None
        )
        self.last_positive_at: float | None = None
        self.last_positive_label: str | None = None

    @staticmethod
    def _intersection_area(
        box_a: tuple[float, float, float, float],
        box_b: tuple[float, float, float, float],
    ) -> float:
        left = max(box_a[0], box_b[0])
        top = max(box_a[1], box_b[1])
        right = min(box_a[2], box_b[2])
        bottom = min(box_a[3], box_b[3])
        return max(0.0, right - left) * max(0.0, bottom - top)

    @staticmethod
    def _expand_bbox(
        bbox: tuple[float, float, float, float],
        padding_ratio: float = 0.18,
    ) -> tuple[float, float, float, float]:
        x1, y1, x2, y2 = bbox
        width = max(0.0, x2 - x1)
        height = max(0.0, y2 - y1)
        pad_x = width * padding_ratio
        pad_y = height * padding_ratio
        return (x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y)

    @classmethod
    def _matches_detected_hand(
        cls,
        bbox: tuple[float, float, float, float] | None,
        hand_boxes: list[tuple[float, float, float, float]],
    ) -> bool:
        if not hand_boxes:
            return False

        if bbox is None:
            return True

        x1, y1, x2, y2 = bbox
        predicted_area = max(1.0, (x2 - x1) * (y2 - y1))
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2

        for hand_box in hand_boxes:
            overlap_ratio = cls._intersection_area(bbox, hand_box) / predicted_area
            if overlap_ratio >= 0.12:
                return True

            expanded_box = cls._expand_bbox(hand_box)
            if (
                expanded_box[0] <= center_x <= expanded_box[2]
                and expanded_box[1] <= center_y <= expanded_box[3]
            ):
                return True

        return False

    def _detect_hand_boxes(self, frame) -> list[tuple[float, float, float, float]]:
        if self.hands is None:
            return []

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)
        if not results.multi_hand_landmarks:
            return []

        frame_height, frame_width = frame.shape[:2]
        hand_boxes: list[tuple[float, float, float, float]] = []
        for hand_landmarks in results.multi_hand_landmarks:
            xs = [point.x for point in hand_landmarks.landmark]
            ys = [point.y for point in hand_landmarks.landmark]
            x1 = max(0.0, min(xs) * frame_width)
            y1 = max(0.0, min(ys) * frame_height)
            x2 = min(float(frame_width), max(xs) * frame_width)
            y2 = min(float(frame_height), max(ys) * frame_height)
            if x2 > x1 and y2 > y1:
                hand_boxes.append((x1, y1, x2, y2))

        return hand_boxes

    def predict(self, frame) -> HandPrediction:
        label = 'uncertain'
        score = 0.0
        bbox: tuple[float, float, float, float] | None = None

        if self.model is not None:
            results = self.model.predict(frame, verbose=False)
            if results:
                result = results[0]
                names = result.names

                if getattr(result, 'boxes', None) is not None and len(result.boxes) > 0:
                    confs = result.boxes.conf.tolist()
                    classes = result.boxes.cls.tolist()
                    boxes = result.boxes.xyxy.tolist()
                    best_idx = max(range(len(confs)), key=lambda index: confs[index])
                    label = str(names[int(classes[best_idx])]).lower()
                    score = float(confs[best_idx])
                    box = boxes[best_idx]
                    bbox = (float(box[0]), float(box[1]), float(box[2]), float(box[3]))
                elif result.probs is not None:
                    probs = result.probs.data.tolist()
                    best_idx = int(result.probs.top1)
                    label = str(names[best_idx]).lower()
                    score = float(probs[best_idx])

        if label in {'s', 'o'} and score >= self.confidence_threshold:
            detected_hand_boxes = self._detect_hand_boxes(frame)
            if not self._matches_detected_hand(bbox, detected_hand_boxes):
                label = 'uncertain'
                score = 0.0
                bbox = None

        if label in {'s', 'o'} and score >= self.confidence_threshold:
            if self.last_positive_label != label:
                self.last_positive_label = label
                self.last_positive_at = monotonic()
            elif self.last_positive_at is None:
                self.last_positive_at = monotonic()
        else:
            self.last_positive_label = None
            self.last_positive_at = None

        stable_seconds = (monotonic() - self.last_positive_at) if self.last_positive_at else 0.0
        return HandPrediction(label=label, score=score, stable_seconds=stable_seconds, bbox=bbox)

