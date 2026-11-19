from collections import deque

NOSE = 1
CHIN = 152


class HeadPoseDetector:
    def __init__(self, smooth_window: int = 7):
        self.buffer = deque(maxlen=smooth_window)

    def detect_pitch(self, coords: list[tuple[float, float]]) -> float:
        nose_y = coords[NOSE][1]
        chin_y = coords[CHIN][1]
        vertical = chin_y - nose_y
        self.buffer.append(vertical)
        baseline = sum(self.buffer) / len(self.buffer)
        return baseline / 10.0
