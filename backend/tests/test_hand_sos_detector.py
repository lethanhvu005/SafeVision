from ai_engine.detectors.hand_sos_detector import HandSosDetector


def test_detected_hand_is_required_for_classification_models():
    assert HandSosDetector._matches_detected_hand(None, []) is False
    assert HandSosDetector._matches_detected_hand(None, [(10.0, 10.0, 60.0, 60.0)]) is True


def test_bbox_must_overlap_detected_hand_region():
    bbox = (20.0, 20.0, 80.0, 80.0)
    hand_boxes = [(25.0, 25.0, 70.0, 70.0)]
    assert HandSosDetector._matches_detected_hand(bbox, hand_boxes) is True


def test_bbox_far_from_detected_hand_region_is_rejected():
    bbox = (220.0, 40.0, 320.0, 160.0)
    hand_boxes = [(20.0, 20.0, 80.0, 80.0)]
    assert HandSosDetector._matches_detected_hand(bbox, hand_boxes) is False
