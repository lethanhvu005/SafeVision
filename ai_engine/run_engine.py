import argparse
import json
from pathlib import Path

import cv2

from ai_engine.runtime.frame_processor import FrameProcessor


def main() -> None:
    parser = argparse.ArgumentParser(description='Driver Safety AI Engine')
    parser.add_argument('--camera', default='0', help='Camera index or video path')
    parser.add_argument('--model-path', default='bestSOS.pt', help='Path to SOS gesture model')
    parser.add_argument('--output-json', default='storage/logs/last_ai_state.json', help='Path to save latest inference')
    args = parser.parse_args()

    source = int(args.camera) if str(args.camera).isdigit() else args.camera
    cap = cv2.VideoCapture(source)
    processor = FrameProcessor(args.model_path)
    output_path = Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            output_path.write_text(json.dumps({
                'ear': 0.0,
                'mar': 0.0,
                'head_pitch': 0.0,
                'sos_score': 0.0,
                'sos_label': 'camera_unavailable',
                'sos_stable_seconds': 0.0,
                'drowsiness_level': 0,
                'reason': 'không đọc được dữ liệu camera',
                'sos_triggered': False,
                'camera_available': False,
                'face_detected': False,
            }, ensure_ascii=False, indent=2), encoding='utf-8')
            break
        result = processor.process(frame)
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        cv2.putText(frame, f"Level: {result['drowsiness_level']} | {result['reason']}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255) if result['drowsiness_level'] >= 2 else (0, 255, 0), 2)
        cv2.putText(frame, f"EAR {result['ear']} MAR {result['mar']} HEAD {result['head_pitch']}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"SOS {result['sos_label']} {result['sos_score']:.2f}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        if result['sos_triggered']:
            cv2.putText(frame, 'SOS DETECTED', (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.imshow('Driver Safety AI Engine', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
