from collections import deque
from dataclasses import dataclass
from time import monotonic


@dataclass(slots=True)
class RuleThresholds:
    ear_threshold: float = 0.21
    mar_threshold: float = 0.6
    head_pose_threshold: float = 15.0
    eye_closed_frames_threshold: int = 3
    yawn_frames_threshold: int = 2
    head_nod_frames_threshold: int = 3
    sos_hold_seconds: int = 3
    yawn_alert_count_threshold: int = 2
    yawn_window_seconds: float = 30.0


@dataclass(slots=True)
class FrameMetrics:
    ear: float
    mar: float
    head_pitch: float
    sos_score: float
    sos_stable_seconds: float = 0.0


@dataclass(slots=True)
class RuleState:
    level: int
    eye_closed_frames: int
    yawn_frames: int
    head_nod_frames: int
    reason: str
    sos_triggered: bool = False


class DrowsinessRuleEngine:
    def __init__(self, thresholds: RuleThresholds):
        self.thresholds = thresholds
        self.eye_closed_frames = 0
        self.yawn_frames = 0
        self.head_nod_frames = 0
        self.yawn_timestamps: deque[float] = deque()
    # đủ điền kiện 1 lần ngáp
    def _register_yawn_if_completed(self) -> None:
        if self.yawn_frames >= self.thresholds.yawn_frames_threshold:
            self.yawn_timestamps.append(monotonic())
        self.yawn_frames = 0
    # xóa ngáp cũ
    def _prune_old_yawns(self) -> None:
        now = monotonic()
        while self.yawn_timestamps and now - self.yawn_timestamps[0] > self.thresholds.yawn_window_seconds:
            self.yawn_timestamps.popleft()

    def update(self, metrics: FrameMetrics) -> RuleState:
        # cộng frame
        self.eye_closed_frames = self.eye_closed_frames + 1 if metrics.ear < self.thresholds.ear_threshold else 0
        self.head_nod_frames = self.head_nod_frames + 1 if metrics.head_pitch > self.thresholds.head_pose_threshold else 0

        if metrics.mar > self.thresholds.mar_threshold:
            self.yawn_frames += 1
        elif self.yawn_frames > 0:
            self._register_yawn_if_completed()

        self._prune_old_yawns()

        level = 0
        reason = 'normal'

        if self.eye_closed_frames >= self.thresholds.eye_closed_frames_threshold:
            level = max(level, 2)
            reason = 'eyes_closed'
        if len(self.yawn_timestamps) >= self.thresholds.yawn_alert_count_threshold:
            level = max(level, 1)
            reason = 'yawn'
        if self.head_nod_frames >= self.thresholds.head_nod_frames_threshold:
            level = max(level, 3)
            reason = 'head_nod'
        if sum([
            self.eye_closed_frames >= self.thresholds.eye_closed_frames_threshold,
            len(self.yawn_timestamps) >= self.thresholds.yawn_alert_count_threshold,
            self.head_nod_frames >= self.thresholds.head_nod_frames_threshold,
        ]) >= 2:
            level = 3
            reason = 'multi_signal'

        sos_triggered = metrics.sos_score >= 0.7 and metrics.sos_stable_seconds >= self.thresholds.sos_hold_seconds
        return RuleState(
            level=level,
            eye_closed_frames=self.eye_closed_frames,
            yawn_frames=self.yawn_frames,
            head_nod_frames=self.head_nod_frames,
            reason=reason,
            sos_triggered=sos_triggered,
        )
