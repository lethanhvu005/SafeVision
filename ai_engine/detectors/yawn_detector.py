from collections import deque
from math import dist


class YawnDetector:
    def __init__(self, smooth_window: int = 5):
        self.buffer = deque(maxlen=smooth_window)

    @staticmethod
    def calculate_mouth_aspect_ratio(coords: list[tuple[float, float]]) -> float:
        d1 = dist(coords[13], coords[14])
        d2 = dist(coords[81], coords[178])
        d3 = dist(coords[311], coords[402])
        horizontal = dist(coords[61], coords[291])
        return (d1 + d2 + d3) / (2.0 * horizontal) if horizontal else 0.0

    def detect(self, coords: list[tuple[float, float]]) -> float:
        mar = self.calculate_mouth_aspect_ratio(coords)
        self.buffer.append(mar)
        return sum(self.buffer) / len(self.buffer)
