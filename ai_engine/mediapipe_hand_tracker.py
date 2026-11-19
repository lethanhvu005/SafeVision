from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import cv2

from ai_engine.safe_mediapipe import load_mediapipe

mp, _MEDIAPIPE_IMPORT_ERROR, _MEDIAPIPE_IMPORT_NOTE = load_mediapipe()


@dataclass(slots=True)
class HandLandmarkPoint:
    hand_index: int
    landmark_id: int
    x: float
    y: float
    z: float
    pixel_x: int
    pixel_y: int


class MediaPipeHandTracker:
    """Independent MediaPipe Hands tracker that does not modify the existing SOS pipeline."""

    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 2,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1,
        draw_landmarks: bool = True,
        flip_for_selfie_view: bool = False,
    ) -> None:
        if mp is None:
            raise RuntimeError(
                "MediaPipe is not installed. Install it with: pip install mediapipe"
            ) from _MEDIAPIPE_IMPORT_ERROR
        if not hasattr(mp, "solutions"):
            raise RuntimeError(
                "The current MediaPipe build does not expose 'mp.solutions'. "
                "Please install a classic Hands-compatible version, for example: "
                "pip install mediapipe==0.10.21"
            )

        self.draw_landmarks_enabled = draw_landmarks
        self.flip_for_selfie_view = flip_for_selfie_view

        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            model_complexity=model_complexity,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

    def close(self) -> None:
        self.hands.close()

    def __enter__(self) -> "MediaPipeHandTracker":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def process_frame(self, frame: Any, draw: bool | None = None) -> dict[str, Any]:
        """
        Process a BGR frame and return an annotated frame plus MediaPipe hand landmarks.

        Return shape:
        {
            "frame": <annotated_frame>,
            "landmarks": [
                {
                    "hand_index": 0,
                    "landmark_id": 0,
                    "x": 0.0,
                    "y": 0.0,
                    "z": 0.0,
                    "pixel_x": 0,
                    "pixel_y": 0,
                },
                ...
            ],
            "hand_count": 0,
            "handedness": [
                {"hand_index": 0, "label": "Left", "score": 0.99}
            ],
        }
        """
        if frame is None or not hasattr(frame, "shape"):
            return {
                "frame": frame,
                "landmarks": [],
                "hand_count": 0,
                "handedness": [],
            }

        should_draw = self.draw_landmarks_enabled if draw is None else draw
        working_frame = cv2.flip(frame, 1) if self.flip_for_selfie_view else frame.copy()
        rgb_frame = cv2.cvtColor(working_frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        results = self.hands.process(rgb_frame)
        rgb_frame.flags.writeable = True

        annotated_frame = working_frame.copy()
        height, width = annotated_frame.shape[:2]
        landmarks: list[dict[str, Any]] = []
        handedness = self._extract_handedness(results)

        if results.multi_hand_landmarks:
            for hand_index, hand_landmarks in enumerate(results.multi_hand_landmarks):
                if should_draw:
                    self.mp_drawing.draw_landmarks(
                        annotated_frame,
                        hand_landmarks,
                        self.mp_hands.HAND_CONNECTIONS,
                        self.mp_drawing_styles.get_default_hand_landmarks_style(),
                        self.mp_drawing_styles.get_default_hand_connections_style(),
                    )

                landmarks.extend(
                    self._extract_landmark_points(
                        hand_index=hand_index,
                        hand_landmarks=hand_landmarks,
                        frame_width=width,
                        frame_height=height,
                    )
                )

        return {
            "frame": annotated_frame,
            "landmarks": landmarks,
            "hand_count": len(results.multi_hand_landmarks or []),
            "handedness": handedness,
        }

    def analyze_landmarks_for_future_sos(self, landmarks: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Optional helper for future SOS research.
        This method does NOT run automatically and does NOT replace the current SOS system.
        """
        hands: dict[int, list[dict[str, Any]]] = {}
        for point in landmarks:
            hands.setdefault(int(point["hand_index"]), []).append(point)

        summaries: list[dict[str, Any]] = []
        for hand_index, points in sorted(hands.items()):
            pixel_x_values = [int(point["pixel_x"]) for point in points]
            pixel_y_values = [int(point["pixel_y"]) for point in points]
            depth_values = [float(point["z"]) for point in points]

            summaries.append(
                {
                    "hand_index": hand_index,
                    "landmark_count": len(points),
                    "bounding_box": {
                        "left": min(pixel_x_values),
                        "top": min(pixel_y_values),
                        "right": max(pixel_x_values),
                        "bottom": max(pixel_y_values),
                    },
                    "center": {
                        "x": int(sum(pixel_x_values) / len(pixel_x_values)),
                        "y": int(sum(pixel_y_values) / len(pixel_y_values)),
                    },
                    "depth_range": {
                        "min_z": min(depth_values),
                        "max_z": max(depth_values),
                    },
                }
            )

        return {
            "hand_count": len(summaries),
            "hands": summaries,
        }

    def run_webcam_demo(self, source: int | str = 0, window_name: str = "MediaPipe Hands Demo") -> None:
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video source: {source}")

        try:
            while True:
                success, frame = cap.read()
                if not success:
                    break

                result = self.process_frame(frame)
                output_frame = result["frame"]
                hand_count = int(result["hand_count"])

                cv2.putText(
                    output_frame,
                    f"Hands detected: {hand_count}",
                    (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (0, 255, 0),
                    2,
                )

                for hand_info in result["handedness"]:
                    hand_index = int(hand_info["hand_index"])
                    label = str(hand_info["label"])
                    score = float(hand_info["score"])
                    cv2.putText(
                        output_frame,
                        f"Hand {hand_index}: {label} ({score:.2f})",
                        (20, 70 + hand_index * 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),
                        2,
                    )

                cv2.imshow(window_name, output_frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            cap.release()
            cv2.destroyAllWindows()

    def _extract_landmark_points(
        self,
        hand_index: int,
        hand_landmarks: Any,
        frame_width: int,
        frame_height: int,
    ) -> list[dict[str, Any]]:
        points: list[dict[str, Any]] = []
        for landmark_id, landmark in enumerate(hand_landmarks.landmark):
            pixel_x = min(max(int(landmark.x * frame_width), 0), max(frame_width - 1, 0))
            pixel_y = min(max(int(landmark.y * frame_height), 0), max(frame_height - 1, 0))
            points.append(
                asdict(
                    HandLandmarkPoint(
                        hand_index=hand_index,
                        landmark_id=landmark_id,
                        x=float(landmark.x),
                        y=float(landmark.y),
                        z=float(landmark.z),
                        pixel_x=pixel_x,
                        pixel_y=pixel_y,
                    )
                )
            )
        return points

    @staticmethod
    def _extract_handedness(results: Any) -> list[dict[str, Any]]:
        handedness: list[dict[str, Any]] = []
        if not getattr(results, "multi_handedness", None):
            return handedness

        for hand_index, classification_list in enumerate(results.multi_handedness):
            if not classification_list.classification:
                continue

            classification = classification_list.classification[0]
            handedness.append(
                {
                    "hand_index": hand_index,
                    "label": classification.label,
                    "score": float(classification.score),
                }
            )
        return handedness


def run_webcam_demo(source: int | str = 0) -> None:
    with MediaPipeHandTracker() as tracker:
        tracker.run_webcam_demo(source=source)


if __name__ == "__main__":
    run_webcam_demo()

