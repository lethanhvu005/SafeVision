import { useEffect, useState, type RefObject } from 'react';
import { HandSkeleton, type HandPoint } from './HandSkeleton';
import type { HandLandmarker } from '@mediapipe/tasks-vision';

// Local landmarks only draw the overlay; SOS decisions still come from the API.
export function LiveHandSkeleton({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const [points, setPoints] = useState<HandPoint[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let animation = 0;
    let detector: HandLandmarker | undefined;
    let lastTime = -1;
    let lastRun = 0;
    async function start() {
      try {
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const files = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm',
        );
        if (disposed) return;
        detector = await HandLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          },
          runningMode: 'VIDEO', numHands: 2,
        });
        if (disposed) { detector.close(); return; }
        const tick = (now: number) => {
          if (disposed) return;
          const video = videoRef.current;
          try {
            if (video && video.readyState >= 2 && video.currentTime !== lastTime && now - lastRun >= 50) {
              lastTime = video.currentTime;
              lastRun = now;
              const result = detector!.detectForVideo(video, now);
              setPoints(result.landmarks.flatMap((hand, hand_index) => hand.map((p, landmark_id) => ({
                hand_index, landmark_id, x: p.x, y: p.y,
              }))));
            }
            animation = requestAnimationFrame(tick);
          } catch {
            setPoints([]);
            setError(true);
            detector?.close();
            detector = undefined;
          }
        };
        animation = requestAnimationFrame(tick);
      } catch {
        if (!disposed) setError(true);
      }
    }
    void start();
    return () => { disposed = true; cancelAnimationFrame(animation); detector?.close(); };
  }, [videoRef]);
  if (error) return <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-slate-950/90 p-2 text-sm text-white" style={{ transform: 'scaleX(-1)' }}>
    Không tải được khung tay trên thiết bị. Kiểm tra kết nối rồi bật lại camera.
  </div>;
  return <HandSkeleton points={points} width={videoRef.current?.videoWidth ?? 0} height={videoRef.current?.videoHeight ?? 0} />;
}
