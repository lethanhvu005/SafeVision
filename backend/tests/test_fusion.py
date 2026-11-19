from ai_engine.detectors.fusion_engine import DrowsinessRuleEngine, FrameMetrics, RuleThresholds


def test_rule_engine_escalates_to_danger():
    engine = DrowsinessRuleEngine(RuleThresholds())
    metrics = [FrameMetrics(ear=0.18, mar=0.7, head_pitch=18, sos_score=0.1) for _ in range(4)]
    state = None
    for item in metrics:
        state = engine.update(item)
    assert state.level >= 2


def test_rule_engine_counts_two_yawns_as_alert():
    engine = DrowsinessRuleEngine(RuleThresholds())
    sequence = [
        FrameMetrics(ear=0.3, mar=0.7, head_pitch=0, sos_score=0.0),
        FrameMetrics(ear=0.3, mar=0.72, head_pitch=0, sos_score=0.0),
        FrameMetrics(ear=0.3, mar=0.2, head_pitch=0, sos_score=0.0),
        FrameMetrics(ear=0.3, mar=0.71, head_pitch=0, sos_score=0.0),
        FrameMetrics(ear=0.3, mar=0.73, head_pitch=0, sos_score=0.0),
        FrameMetrics(ear=0.3, mar=0.2, head_pitch=0, sos_score=0.0),
    ]
    state = None
    for item in sequence:
        state = engine.update(item)
    assert state.reason == 'yawn'
    assert state.level >= 1
