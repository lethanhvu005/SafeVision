from ai_engine.detectors.mediapipe_sos_detector import MediaPipeSosDetector


def _build_landmarks(pixel_points: dict[int, tuple[int, int]], width: int = 240, height: int = 260):
    landmarks = []
    for landmark_id in range(21):
        pixel_x, pixel_y = pixel_points[landmark_id]
        landmarks.append(
            {
                'hand_index': 0,
                'landmark_id': landmark_id,
                'x': pixel_x / width,
                'y': pixel_y / height,
                'z': 0.0,
                'pixel_x': pixel_x,
                'pixel_y': pixel_y,
            }
        )
    return landmarks


def _build_detector() -> MediaPipeSosDetector:
    detector = MediaPipeSosDetector.__new__(MediaPipeSosDetector)
    detector.sequence_timeout_seconds = 3.0
    detector.current_stage = 0
    detector.sequence_started_at = None
    detector.active_handedness = None
    detector.tracker = None
    detector.tracker_error = None
    return detector


RIGHT_STAGE_1 = {
    0: (120, 210),
    1: (102, 192),
    2: (90, 176),
    3: (76, 160),
    4: (58, 148),
    5: (92, 164),
    6: (90, 142),
    7: (88, 118),
    8: (86, 92),
    9: (118, 160),
    10: (118, 132),
    11: (118, 102),
    12: (118, 74),
    13: (144, 164),
    14: (146, 138),
    15: (148, 112),
    16: (150, 88),
    17: (168, 172),
    18: (172, 150),
    19: (176, 128),
    20: (180, 108),
}

RIGHT_STAGE_2 = {
    0: (120, 210),
    1: (108, 194),
    2: (96, 182),
    3: (110, 176),
    4: (128, 174),
    5: (92, 164),
    6: (90, 142),
    7: (88, 118),
    8: (86, 92),
    9: (118, 160),
    10: (118, 132),
    11: (118, 102),
    12: (118, 74),
    13: (144, 164),
    14: (146, 138),
    15: (148, 112),
    16: (150, 88),
    17: (168, 172),
    18: (172, 150),
    19: (176, 128),
    20: (180, 108),
}

RIGHT_STAGE_3 = {
    0: (120, 210),
    1: (108, 194),
    2: (96, 182),
    3: (110, 176),
    4: (128, 174),
    5: (92, 164),
    6: (96, 154),
    7: (100, 166),
    8: (104, 182),
    9: (118, 160),
    10: (120, 150),
    11: (122, 164),
    12: (124, 184),
    13: (144, 164),
    14: (146, 154),
    15: (148, 168),
    16: (150, 186),
    17: (168, 172),
    18: (168, 160),
    19: (168, 174),
    20: (168, 192),
}

LEFT_STAGE_1 = {
    0: (120, 210),
    1: (138, 192),
    2: (150, 176),
    3: (164, 160),
    4: (182, 148),
    5: (92, 164),
    6: (90, 142),
    7: (88, 118),
    8: (86, 92),
    9: (118, 160),
    10: (118, 132),
    11: (118, 102),
    12: (118, 74),
    13: (144, 164),
    14: (146, 138),
    15: (148, 112),
    16: (150, 88),
    17: (168, 172),
    18: (172, 150),
    19: (176, 128),
    20: (180, 108),
}

LEFT_STAGE_2 = {
    0: (120, 210),
    1: (132, 194),
    2: (144, 182),
    3: (130, 176),
    4: (112, 174),
    5: (92, 164),
    6: (90, 142),
    7: (88, 118),
    8: (86, 92),
    9: (118, 160),
    10: (118, 132),
    11: (118, 102),
    12: (118, 74),
    13: (144, 164),
    14: (146, 138),
    15: (148, 112),
    16: (150, 88),
    17: (168, 172),
    18: (172, 150),
    19: (176, 128),
    20: (180, 108),
}


def test_stage_sequence_detects_sos_under_three_seconds():
    detector = _build_detector()

    result_1 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_1), handedness='Right', now=0.0)
    result_2 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_2), handedness='Right', now=0.6)
    result_3 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_3), handedness='Right', now=1.4)
    result_4 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_2), handedness='Right', now=2.1)

    assert result_1.stage == 1
    assert result_2.stage == 2
    assert result_3.stage == 3
    assert result_4.sos_triggered is True
    assert result_4.label == 'sos_detection'
    assert result_4.elapsed_seconds == 1.5
    assert detector.current_stage == 0


def test_stage_sequence_resets_if_it_takes_too_long():
    detector = _build_detector()

    detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_1), handedness='Right', now=0.0)
    detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_2), handedness='Right', now=0.4)
    detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_3), handedness='Right', now=1.2)
    final_result = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_2), handedness='Right', now=3.8)

    assert final_result.sos_triggered is False
    assert detector.current_stage == 0


def test_left_hand_thumb_logic_is_supported():
    detector = _build_detector()

    stage_1_result = detector.detect_stage_signal(_build_landmarks(LEFT_STAGE_1), handedness='Left', now=0.0)
    stage_2_result = detector.detect_stage_signal(_build_landmarks(LEFT_STAGE_2), handedness='Left', now=0.5)

    assert stage_1_result.stage == 1
    assert stage_2_result.stage == 2
    assert detector.active_handedness == 'Left'


def test_open_palm_only_does_not_trigger_sos():
    detector = _build_detector()

    result_1 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_1), handedness='Right', now=0.0)
    result_2 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_1), handedness='Right', now=1.0)
    result_3 = detector.detect_stage_signal(_build_landmarks(RIGHT_STAGE_1), handedness='Right', now=2.0)

    assert result_1.stage == 1
    assert result_2.sos_triggered is False
    assert result_3.sos_triggered is False
