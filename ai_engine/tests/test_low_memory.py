"""Run with Python 3.11: python -m pytest ai_engine/tests/test_low_memory.py."""
import subprocess
import sys


def test_low_memory_inference_without_torch():
    result = subprocess.run(
        [sys.executable, '-c', '''
import sys
import numpy as np
from ai_engine.runtime.frame_processor import FrameProcessor
processor = FrameProcessor('bestSOS.pt', low_memory=True)
assert processor.face_mesh is not None, processor.face_mesh_error
assert processor.mediapipe_sos_detector.tracker is not None
assert processor.hand_detector.model is None
assert processor.hand_detector.hands is None
for _ in range(5):
    state = processor.process(np.zeros((270, 480, 3), dtype=np.uint8))
    assert state['model_sos_label'] == 'disabled'
    assert state['model_sos_score'] == 0
    assert state['sos_triggered'] is False
    assert state['face_detected'] is False
assert 'torch' not in sys.modules
assert 'ultralytics' not in sys.modules
processor.face_mesh.close()
processor.mediapipe_sos_detector.tracker.close()
'''], capture_output=True, text=True, timeout=90,
    )
    assert result.returncode == 0, result.stdout + result.stderr
