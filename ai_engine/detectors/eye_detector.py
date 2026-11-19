from collections import deque
from math import dist

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]


class EyeDetector:
    def __init__(self, smooth_window: int = 5):
        self.buffer = deque(maxlen=smooth_window)

    @staticmethod
    def calculate_eye_aspect_ratio(points: list[tuple[float, float]]) -> float:
        a = dist(points[1], points[5])
        b = dist(points[2], points[4])
        c = dist(points[0], points[3])
        return (a + b) / (2.0 * c) if c else 0.0

    def detect(self, coords: list[tuple[float, float]]) -> float:
        left = [coords[index] for index in LEFT_EYE]
        right = [coords[index] for index in RIGHT_EYE]
        ear = (self.calculate_eye_aspect_ratio(left) + self.calculate_eye_aspect_ratio(right)) / 2.0
        self.buffer.append(ear)
        return sum(self.buffer) / len(self.buffer)
