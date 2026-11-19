import { useEffect, useMemo, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Camera,
  Crosshair,
  MapPinned,
  OctagonAlert,
  Power,
  Siren,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { apiClient } from '../../api/client';
import { AlertBanner } from '../../components/AlertBanner';
import { CameraPanel } from '../../components/CameraPanel';
import { EventTable, type EventTableColumn } from '../../components/EventTable';
import { MetricBar } from '../../components/MetricBar';
import { StatCard } from '../../components/StatCard';
import { cx, toneChip, type UiTone } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';

interface AiState {
  ear: number;
  mar: number;
  head_pitch: number;
  drowsiness_level: number;
  reason: string;
  sos_score: number;
  sos_triggered: boolean;
  camera_available?: boolean;
  face_detected?: boolean;
  sos_label?: string;
  sos_stable_seconds?: number;
  sos_source?: string;
  sos_bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  mediapipe_sos_label?: string;
  mediapipe_sos_score?: number;
  mediapipe_sos_stable_seconds?: number;
  mediapipe_sos_stage?: number;
  mediapipe_sos_triggered?: boolean;
}

interface DrowsinessEvent {
  id: number;
  event_time: string;
  drowsiness_level: number;
  alert_triggered: boolean;
  meta_json?: string | null;
}

interface SosEvent {
  id: number;
  event_time: string;
  status: string;
  trigger_type: string;
  address?: string | null;
}

interface UserSettings {
  ear_threshold: number;
  mar_threshold: number;
  head_pose_threshold: number;
  eye_closed_frames_threshold: number;
  yawn_frames_threshold: number;
  head_nod_frames_threshold: number;
  sos_hold_seconds: number;
  sound_enabled: boolean;
  auto_send_enabled: boolean;
  email_retry_limit: number;
}

interface LocationResult {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

interface TableRow {
  id: number;
  time: string;
  type: string;
  severity: string;
  severityTone: UiTone;
  status: string;
  detail: string;
}

type SosSequenceState =
  | 'IDLE'
  | 'WAITING_FOR_O'
  | 'WAITING_FOR_FINAL_S'
  | 'SOS_PENDING_CONFIRMATION'
  | 'CONFIRMED';

type SosGestureLabel = 's' | 'o' | null;

interface SosSequenceUiState {
  state: SosSequenceState;
  letters: Array<'S' | 'O'>;
  message: string;
  tone: UiTone;
  deadlineAt: number | null;
  autoSendAt: number | null;
  holdLockLabel: SosGestureLabel;
  cooldownUntil: number;
}

interface SosTriggerOptions {
  triggerType?: 'button' | 'hand_gesture';
  note?: string;
  successMessage?: string;
}

const SOS_CONFIDENCE_THRESHOLD = 0.65;
const SOS_STABLE_SECONDS = 1.0;
const SOS_WAIT_FOR_O_TIMEOUT_MS = 30_000;
const SOS_WAIT_FOR_FINAL_S_TIMEOUT_MS = 120_000;
const SOS_PENDING_CONFIRMATION_MS = 12_000;
const SOS_GESTURE_COOLDOWN_MS = 500;
const SOS_POST_CONFIRM_COOLDOWN_MS = 2_500;
const SOS_CONFIRM_BANNER_MS = 4_000;
const AI_INFER_INTERVAL_MS = 250;

const emptyAiState: AiState = {
  ear: 0,
  mar: 0,
  head_pitch: 0,
  drowsiness_level: 0,
  reason: 'chưa có dữ liệu AI',
  sos_score: 0,
  sos_triggered: false,
  camera_available: false,
  face_detected: false,
  sos_label: 'unavailable',
  sos_stable_seconds: 0,
  sos_source: 'none',
  sos_bbox: null,
  mediapipe_sos_label: 'unavailable',
  mediapipe_sos_score: 0,
  mediapipe_sos_stable_seconds: 0,
  mediapipe_sos_stage: 0,
  mediapipe_sos_triggered: false,
};

const initialSosSequenceState: SosSequenceUiState = {
  state: 'IDLE',
  letters: [],
  message: 'Đặt bàn tay vào khung camera và giữ chữ S khoảng 1 giây để bắt đầu chuỗi SOS.',
  tone: 'info',
  deadlineAt: null,
  autoSendAt: null,
  holdLockLabel: null,
  cooldownUntil: 0,
};

function describeDrowsinessLevel(level: number) {
  if (level >= 3) {
    return {
      label: 'Nguy hiểm',
      tone: 'danger' as UiTone,
      description: 'Tài xế có dấu hiệu buồn ngủ rõ rệt, cần dừng xe an toàn.',
    };
  }
  if (level >= 1) {
    return {
      label: 'Cảnh báo nhẹ',
      tone: 'warning' as UiTone,
      description: 'Phát hiện tín hiệu buồn ngủ ban đầu, nên tăng cường chú ý.',
    };
  }
  return {
    label: 'Bình thường',
    tone: 'success' as UiTone,
    description: 'Chưa phát hiện dấu hiệu nguy hiểm trong phiên theo dõi hiện tại.',
  };
}

function translateReason(reason: string) {
  switch (reason) {
    case 'eyes_closed':
      return 'Nhắm mắt liên tục';
    case 'yawn':
      return 'Ngáp kéo dài';
    case 'head_nod':
      return 'Gật đầu / cúi đầu';
    case 'multi_signal':
      return 'Nhiều tín hiệu cùng lúc';
    case 'normal':
      return 'Trạng thái ổn định';
    default:
      return reason;
  }
}

function translateSosStatus(status: string) {
  switch (status) {
    case 'confirmed':
      return 'Đã xác nhận';
    case 'sent':
      return 'Đã gửi';
    case 'failed':
      return 'Thất bại';
    case 'pending':
      return 'Đang xử lý';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
}

function toneForSosStatus(status: string): UiTone {
  switch (status) {
    case 'failed':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'confirmed':
    case 'sent':
      return 'success';
    default:
      return 'info';
  }
}

function safeParseMeta(meta: string | null | undefined) {
  if (!meta) {
    return null;
  }

  try {
    return JSON.parse(meta) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeGestureLabel(label?: string): SosGestureLabel {
  const normalized = label?.trim().toLowerCase();
  if (normalized === 's') {
    return 's';
  }
  if (normalized === 'o') {
    return 'o';
  }
  return null;
}

function formatCountdown(targetAt: number | null) {
  if (!targetAt) {
    return null;
  }

  const secondsLeft = Math.max(0, Math.ceil((targetAt - Date.now()) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
}

function formatSequenceState(state: SosSequenceState) {
  switch (state) {
    case 'WAITING_FOR_O':
      return 'Đã nhận S';
    case 'WAITING_FOR_FINAL_S':
      return 'Đã nhận S-O';
    case 'SOS_PENDING_CONFIRMATION':
      return 'Chờ xác nhận';
    case 'CONFIRMED':
      return 'Đã xác nhận SOS';
    default:
      return 'Chờ chữ S đầu tiên';
  }
}

function formatGestureLabel(label: SosGestureLabel) {
  return label ? `Chữ ${label.toUpperCase()}` : 'Chưa nhận diện';
}

function formatSosSource(source?: string) {
  switch (source) {
    case 'model':
      return 'Mo hinh SOS';
    case 'mediapipe':
      return 'MediaPipe Hands';
    case 'model+mediapipe':
      return 'Mo hinh + MediaPipe';
    default:
      return 'Chua xac dinh';
  }
}

function formatMediaPipeStage(stage?: number, label?: string) {
  if (label === 'sos_detection') {
    return 'SOS DETECTION';
  }
  switch (stage) {
    case 1:
      return 'Stage 1 - all fingers open';
    case 2:
      return 'Stage 2 - thumb folded';
    case 3:
      return 'Stage 3 - fingers cover thumb';
    default:
      return 'No stage';
  }
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function fallbackDrowsinessRows(): DrowsinessEvent[] {
  return [
    {
      id: 1001,
      event_time: new Date().toISOString(),
      drowsiness_level: 2,
      alert_triggered: true,
      meta_json: JSON.stringify({ reason: 'yawn', ear: 0.24, mar: 0.64, head_pitch: 13 }),
    },
    {
      id: 1002,
      event_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      drowsiness_level: 1,
      alert_triggered: true,
      meta_json: JSON.stringify({ reason: 'eyes_closed', ear: 0.19, mar: 0.42, head_pitch: 9 }),
    },
    {
      id: 1003,
      event_time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      drowsiness_level: 0,
      alert_triggered: false,
      meta_json: JSON.stringify({ reason: 'normal', ear: 0.29, mar: 0.34, head_pitch: 4 }),
    },
  ];
}

function fallbackSosRows(): SosEvent[] {
  return [
    {
      id: 5001,
      event_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'confirmed',
      trigger_type: 'hand_gesture',
      address: 'Khu vực mô phỏng SOS',
    },
    {
      id: 5002,
      event_time: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      status: 'pending',
      trigger_type: 'button',
      address: 'Tuyến đường dự phòng',
    },
  ];
}

export function DashboardPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferIntervalRef = useRef<number | null>(null);
  const alertToneContextRef = useRef<AudioContext | null>(null);
  const isInferRunningRef = useRef(false);
  const lastAlertAtRef = useRef(0);
  const lastMediaPipeSosAtRef = useRef(0);
  const isSendingSosRef = useRef(false);
  const sosSequenceRef = useRef<SosSequenceUiState>(initialSosSequenceState);
  const queryClient = useQueryClient();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Chưa lấy vị trí');
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(null);
  const [sosMessage, setSosMessage] = useState<string | null>(null);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isUpdatingSound, setIsUpdatingSound] = useState(false);
  const [soundNotice, setSoundNotice] = useState<{ level: UiTone; message: string } | null>(null);
  const [aiState, setAiState] = useState<AiState>(emptyAiState);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sosSequence, setSosSequence] = useState<SosSequenceUiState>(initialSosSequenceState);

  const drowsinessQuery = useQuery({
    queryKey: ['drowsiness-events'],
    queryFn: async () => (await apiClient.get<DrowsinessEvent[]>('/drowsiness/events')).data,
    retry: false,
  });

  const sosHistoryQuery = useQuery({
    queryKey: ['sos-history'],
    queryFn: async () => (await apiClient.get<SosEvent[]>('/sos/history')).data,
    retry: false,
  });

  const settingsQuery = useQuery({
    queryKey: ['my-settings'],
    queryFn: async () => (await apiClient.get<UserSettings>('/profile/settings')).data,
    retry: false,
  });

  const settings = settingsQuery.data;

  useEffect(() => {
    if (typeof settings?.sound_enabled === 'boolean') {
      setSoundEnabled(settings.sound_enabled);
    }
  }, [settings?.sound_enabled]);

  useEffect(() => {
    if (!soundNotice) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSoundNotice(null);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [soundNotice]);

  const detectedGesture = normalizeGestureLabel(aiState.sos_label);
  const gestureIsConfident =
    detectedGesture !== null && aiState.sos_score >= SOS_CONFIDENCE_THRESHOLD;
  const gestureIsStable =
    gestureIsConfident && (aiState.sos_stable_seconds ?? 0) >= SOS_STABLE_SECONDS;
  const sequenceCountdown =
    sosSequence.state === 'SOS_PENDING_CONFIRMATION'
      ? formatCountdown(sosSequence.autoSendAt)
      : formatCountdown(sosSequence.deadlineAt);
  const sequenceIsActive = sosSequence.state !== 'IDLE';
  const sosEmergencyActive =
    isSendingSos ||
    Boolean(aiState.mediapipe_sos_triggered) ||
    sosSequence.state === 'CONFIRMED' ||
    sosSequence.state === 'SOS_PENDING_CONFIRMATION';

  function applySosSequenceState(next: SosSequenceUiState) {
    sosSequenceRef.current = next;
    setSosSequence(next);
  }

  function resetSosSequence(
    message = initialSosSequenceState.message,
    tone: UiTone = 'info',
    options?: {
      holdLockLabel?: SosGestureLabel;
      cooldownMs?: number;
    },
  ) {
    applySosSequenceState({
      ...initialSosSequenceState,
      message,
      tone,
      holdLockLabel: options?.holdLockLabel ?? null,
      cooldownUntil: Date.now() + (options?.cooldownMs ?? 0),
    });
  }

  useEffect(() => {
    isSendingSosRef.current = isSendingSos;
  }, [isSendingSos]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const primeVoices = () => {
      window.speechSynthesis.getVoices();
    };

    primeVoices();
    window.speechSynthesis.addEventListener('voiceschanged', primeVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', primeVoices);
    };
  }, []);

  useEffect(() => {
    void startCamera();
    void requestLocation();
    return () => {
      stopCameraStream({ resetState: false });
      window.speechSynthesis?.cancel();
      void alertToneContextRef.current?.close().catch(() => undefined);
      alertToneContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!soundEnabled) {
      return;
    }

    const now = Date.now();
    const shouldAlert = aiState.drowsiness_level >= 1;
    if (!shouldAlert) {
      lastAlertAtRef.current = 0;
      return;
    }

    const cooldownMs =
      aiState.drowsiness_level >= 3
        ? 2_000
        : aiState.drowsiness_level >= 2
          ? 3_500
          : 5_000;

    if (now - lastAlertAtRef.current < cooldownMs) {
      return;
    }

    playAlertVoice(aiState.drowsiness_level);
    lastAlertAtRef.current = now;
  }, [aiState, soundEnabled]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const current = sosSequenceRef.current;
      const now = Date.now();

      if (current.state === 'WAITING_FOR_O' && current.deadlineAt && now >= current.deadlineAt) {
        resetSosSequence(
          'Quá 30 giây mà chưa nhận được chữ O. Chuỗi SOS đã hủy và hệ thống quay về trạng thái ban đầu.',
          'warning',
        );
        return;
      }

      if (
        current.state === 'WAITING_FOR_FINAL_S' &&
        current.deadlineAt &&
        now >= current.deadlineAt
      ) {
        applySosSequenceState({
          state: 'SOS_PENDING_CONFIRMATION',
          letters: ['S', 'O'],
          message:
            'Đã nhận chuỗi S-O nhưng chưa hoàn tất S-O-S. Bạn có cần gửi SOS ngay không?',
          tone: 'warning',
          deadlineAt: null,
          autoSendAt: now + SOS_PENDING_CONFIRMATION_MS,
          holdLockLabel: current.holdLockLabel,
          cooldownUntil: now + SOS_GESTURE_COOLDOWN_MS,
        });
        return;
      }

      if (
        current.state === 'SOS_PENDING_CONFIRMATION' &&
        current.autoSendAt &&
        now >= current.autoSendAt &&
        !isSendingSosRef.current
      ) {
        if (soundEnabled) {
          playSosVoice('Đang gửi SOS khẩn cấp.');
        }
        applySosSequenceState({
          state: 'CONFIRMED',
          letters: ['S', 'O'],
          message: 'Đã tự động gửi SOS từ trạng thái chờ xác nhận.',
          tone: 'danger',
          deadlineAt: now + SOS_CONFIRM_BANNER_MS,
          autoSendAt: null,
          holdLockLabel: current.holdLockLabel,
          cooldownUntil: now + SOS_POST_CONFIRM_COOLDOWN_MS,
        });
        void handleSos({
          triggerType: 'hand_gesture',
          note: 'Tự động gửi SOS sau khi đã nhận chuỗi S-O và hết thời gian chờ xác nhận.',
          successMessage: 'Đã tự động gửi SOS từ chuỗi S-O đang chờ xác nhận.',
        });
        return;
      }

      if (current.state === 'CONFIRMED' && current.deadlineAt && now >= current.deadlineAt) {
        resetSosSequence();
      }
    }, 400);

    return () => {
      window.clearInterval(timerId);
    };
  }, [soundEnabled]);

  useEffect(() => {
    const now = Date.now();
    const previous = sosSequenceRef.current;
    let next = previous;
    let shouldTriggerSos = false;
    let nextTriggerNote =
      'Đã xác nhận chuỗi S-O-S hợp lệ từ cử chỉ tay, hệ thống đang gửi SOS khẩn cấp.';
    let nextSuccessMessage = 'Đã gửi SOS sau khi xác nhận đầy đủ chuỗi S-O-S.';

    if (previous.holdLockLabel && detectedGesture !== previous.holdLockLabel) {
      next = {
        ...next,
        holdLockLabel: null,
      };
    }

    if (
      !gestureIsStable ||
      detectedGesture === null ||
      next.holdLockLabel === detectedGesture ||
      now < next.cooldownUntil ||
      isSendingSosRef.current
    ) {
      if (next !== previous) {
        applySosSequenceState(next);
      }
      return;
    }

    if (next.state === 'IDLE') {
      if (detectedGesture !== 's') {
        if (next !== previous) {
          applySosSequenceState(next);
        }
        return;
      }

      next = {
        state: 'WAITING_FOR_O',
        letters: ['S'],
        message: 'Đã nhận S, vui lòng thực hiện chữ O.',
        tone: 'info',
        deadlineAt: now + SOS_WAIT_FOR_O_TIMEOUT_MS,
        autoSendAt: null,
        holdLockLabel: 's',
        cooldownUntil: now + SOS_GESTURE_COOLDOWN_MS,
      };
    } else if (next.state === 'WAITING_FOR_O') {
      if (detectedGesture !== 'o') {
        if (next !== previous) {
          applySosSequenceState(next);
        }
        return;
      }

      next = {
        state: 'WAITING_FOR_FINAL_S',
        letters: ['S', 'O'],
        message: 'Đã nhận S-O, vui lòng thực hiện chữ S cuối để gửi SOS.',
        tone: 'warning',
        deadlineAt: now + SOS_WAIT_FOR_FINAL_S_TIMEOUT_MS,
        autoSendAt: null,
        holdLockLabel: 'o',
        cooldownUntil: now + SOS_GESTURE_COOLDOWN_MS,
      };
    } else if (
      next.state === 'WAITING_FOR_FINAL_S' ||
      next.state === 'SOS_PENDING_CONFIRMATION'
    ) {
      if (detectedGesture !== 's') {
        if (next !== previous) {
          applySosSequenceState(next);
        }
        return;
      }

      shouldTriggerSos = true;
      if (next.state === 'SOS_PENDING_CONFIRMATION') {
        nextTriggerNote =
          'Người lái đã bổ sung chữ S cuối trong lúc hệ thống đang chờ xác nhận SOS.';
        nextSuccessMessage = 'Đã gửi SOS sau khi bổ sung chữ S cuối trong trạng thái chờ xác nhận.';
      }

      next = {
        state: 'CONFIRMED',
        letters: ['S', 'O', 'S'],
        message: 'Đã xác nhận tín hiệu SOS. Hệ thống đang lấy vị trí và gửi cảnh báo.',
        tone: 'danger',
        deadlineAt: now + SOS_CONFIRM_BANNER_MS,
        autoSendAt: null,
        holdLockLabel: 's',
        cooldownUntil: now + SOS_POST_CONFIRM_COOLDOWN_MS,
      };
    }

    if (next !== previous) {
      applySosSequenceState(next);
    }

    if (shouldTriggerSos) {
      if (soundEnabled) {
        playSosVoice('Đã xác nhận tín hiệu SOS.');
      }
      void handleSos({
        triggerType: 'hand_gesture',
        note: nextTriggerNote,
        successMessage: nextSuccessMessage,
      });
    }
  }, [
    aiState.sos_label,
    aiState.sos_score,
    aiState.sos_stable_seconds,
    gestureIsStable,
    detectedGesture,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!aiState.mediapipe_sos_triggered || isSendingSosRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastMediaPipeSosAtRef.current < 3_000) {
      return;
    }

    lastMediaPipeSosAtRef.current = now;
    if (soundEnabled) {
      playSosVoice('Da phat hien SOS tu MediaPipe Hands.');
    }

    void handleSos({
      triggerType: 'hand_gesture',
      note:
        'SOS kich hoat tu MediaPipe Hands theo chuoi stage 1-2-3-2 trong duoi 3 giay.',
      successMessage: 'Da gui SOS tu MediaPipe Hands.',
    });
  }, [aiState.mediapipe_sos_triggered, soundEnabled]);

  function stopInferenceLoop() {
    if (inferIntervalRef.current !== null) {
      window.clearInterval(inferIntervalRef.current);
      inferIntervalRef.current = null;
    }
  }

  function stopCameraStream({ resetState }: { resetState: boolean }) {
    stopInferenceLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (resetState) {
      setCameraReady(false);
      setAiState(emptyAiState);
      resetSosSequence();
    }
  }

  function getAlertToneContext() {
    if (typeof window === 'undefined' || !('AudioContext' in window)) {
      return null;
    }

    if (!alertToneContextRef.current) {
      alertToneContextRef.current = new window.AudioContext();
    }

    return alertToneContextRef.current;
  }

  async function playAlertTone(level: number) {
    const audioContext = getAlertToneContext();
    if (!audioContext) {
      return;
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch {
        return;
      }
    }

    const baseTime = audioContext.currentTime + 0.02;
    const bursts = level >= 3 ? [0, 0.24, 0.48] : [0, 0.34];
    const peakGain = level >= 3 ? 0.22 : 0.16;
    const baseFrequency = level >= 3 ? 880 : 760;

    bursts.forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startAt = baseTime + offset;

      oscillator.type = level >= 3 ? 'square' : 'triangle';
      oscillator.frequency.setValueAtTime(baseFrequency + index * 35, startAt);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.2);
    });
  }

  function playAlertVoice(level: number) {
    const fallbackToTone = () => {
      void playAlertTone(level);
    };

    if (!('speechSynthesis' in window)) {
      fallbackToTone();
      return;
    }

    const message =
      level >= 3
        ? 'Cảnh báo nguy hiểm. Bạn đang có dấu hiệu buồn ngủ, hãy nghỉ ngơi trước khi lái xe tiếp.'
        : 'Bạn đang có dấu hiệu buồn ngủ, hãy nghỉ ngơi trước khi lái xe.';

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'vi-VN';
    utterance.rate = level >= 3 ? 1.02 : 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;

    let speechStarted = false;
    let fallbackTimerId: number | null = null;

    utterance.onstart = () => {
      speechStarted = true;
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }
    };

    utterance.onerror = () => {
      if (!speechStarted) {
        fallbackToTone();
      }
    };

    try {
      const voices = window.speechSynthesis.getVoices();
      const vietnameseVoice = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith('vi'),
      );
      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      fallbackTimerId = window.setTimeout(() => {
        if (!speechStarted) {
          fallbackToTone();
        }
      }, 600);
    } catch {
      fallbackToTone();
    }
  }

  function playSosVoice(_message: string) {
    // SOS is intentionally silent.
    return;
  }

  function captureCurrentFrameDataUrl() {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  function startInferenceLoop() {
    stopInferenceLoop();
    inferIntervalRef.current = window.setInterval(() => {
      void inferCurrentFrame();
    }, AI_INFER_INTERVAL_MS);
  }

  async function inferCurrentFrame() {
    if (isInferRunningRef.current) {
      return;
    }
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    isInferRunningRef.current = true;
    try {
      const targetWidth = 480;
      const scale = targetWidth / video.videoWidth;
      canvas.width = targetWidth;
      canvas.height = Math.max(270, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Không khởi tạo được vùng vẽ ảnh');
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const response = await apiClient.post<AiState>('/health/ai-infer', {
        frame_data_url: frameDataUrl,
      });
      setAiState(response.data);
      setAiError(null);
    } catch (error: unknown) {
      setAiError(getApiErrorMessage(error, 'Không xử lý được dữ liệu AI từ webcam'));
    } finally {
      isInferRunningRef.current = false;
    }
  }

  async function startCamera() {
    setIsStartingCamera(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Trình duyệt không hỗ trợ camera hoặc trang chưa chạy trong môi trường an toàn.',
        );
        setCameraReady(false);
        return;
      }

      if (
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraError('Camera chỉ hoạt động trên HTTPS hoặc localhost.');
        setCameraReady(false);
        return;
      }

      stopCameraStream({ resetState: false });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setCameraReady(true);
      setCameraError(null);
      setAiState((prev) => ({ ...prev, camera_available: true }));
      resetSosSequence();
      startInferenceLoop();
      void inferCurrentFrame();
    } catch (error: unknown) {
      const name =
        typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
      if (name === 'NotAllowedError') {
        setCameraError(
          'Bạn đã từ chối quyền truy cập camera. Hãy cấp quyền trong trình duyệt rồi thử lại.',
        );
      } else if (name === 'NotFoundError') {
        setCameraError('Không tìm thấy thiết bị camera trên máy này.');
      } else {
        setCameraError('Không mở được webcam. Kiểm tra quyền truy cập camera và thử lại.');
      }
      setCameraReady(false);
      setAiState(emptyAiState);
      resetSosSequence();
      stopInferenceLoop();
    } finally {
      setIsStartingCamera(false);
    }
  }

  function stopCamera() {
    stopCameraStream({ resetState: true });
    setCameraError(null);
    setAiError(null);
  }

  function fallbackCoordinateLabel(latitude: number, longitude: number) {
    return `Vĩ độ ${latitude.toFixed(5)}, Kinh độ ${longitude.toFixed(5)}`;
  }

  function formatAddressFromParts(parts: Record<string, string | undefined>) {
    const ordered = [
      parts.road,
      parts.pedestrian,
      parts.cycleway,
      parts.footway,
      parts.residential,
      parts.neighbourhood,
      parts.suburb,
      parts.quarter,
      parts.city_district,
      parts.district,
      parts.city,
      parts.town,
      parts.state,
    ].filter(Boolean) as string[];

    return [...new Set(ordered)].join(', ');
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    const fallback = fallbackCoordinateLabel(latitude, longitude);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=vi`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        return fallback;
      }

      const data = (await response.json()) as {
        address?: Record<string, string | undefined>;
        display_name?: string;
      };
      const formatted = formatAddressFromParts(data.address ?? {});
      if (formatted) {
        return formatted;
      }

      if (typeof data.display_name === 'string' && data.display_name.trim()) {
        return data.display_name;
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  async function getLocation() {
    return new Promise<LocationResult>((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          latitude: null,
          longitude: null,
          address: 'Trình duyệt không hỗ trợ định vị',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const address = await reverseGeocode(latitude, longitude);
          setLocationLabel(address);
          const result = { latitude, longitude, address };
          setCurrentLocation(result);
          resolve(result);
        },
        () => {
          const fallback = {
            latitude: null,
            longitude: null,
            address: 'Không lấy được vị trí, hệ thống sẽ dùng thông tin dự phòng',
          };
          setCurrentLocation(fallback);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 7_000 },
      );
    });
  }

  async function requestLocation() {
    setIsLocating(true);
    setLocationLabel('Đang tra cứu vị trí...');
    const location = await getLocation();
    setLocationLabel(location.address);
    setIsLocating(false);
  }

  async function toggleSound() {
    if (isUpdatingSound) {
      return;
    }

    const previousSoundEnabled = soundEnabled;
    const nextSoundEnabled = !previousSoundEnabled;

    setSoundEnabled(nextSoundEnabled);
    if (!nextSoundEnabled) {
      window.speechSynthesis?.cancel();
      void alertToneContextRef.current?.suspend().catch(() => undefined);
    }

    setIsUpdatingSound(true);
    try {
      const response = await apiClient.put<UserSettings>('/profile/settings', {
        sound_enabled: nextSoundEnabled,
      });
      queryClient.setQueryData<UserSettings>(['my-settings'], response.data);
      setSoundEnabled(response.data.sound_enabled);
      setSoundNotice({
        level: response.data.sound_enabled ? 'success' : 'warning',
        message: response.data.sound_enabled
          ? 'Âm thanh cảnh báo đã được bật.'
          : 'Âm thanh cảnh báo đã được tắt.',
      });
    } catch (error: unknown) {
      setSoundEnabled(previousSoundEnabled);
      setSoundNotice({
        level: 'danger',
        message: getApiErrorMessage(error, 'Không cập nhật được trạng thái âm thanh.'),
      });
    } finally {
      setIsUpdatingSound(false);
    }
  }

  async function handleSos(options: SosTriggerOptions = {}) {
    setIsSendingSos(true);
    setSosMessage(null);
    try {
      const hasCachedCoordinates =
        currentLocation &&
        currentLocation.latitude !== null &&
        currentLocation.longitude !== null;
      const location = hasCachedCoordinates ? currentLocation : await getLocation();
      const evidenceDataUrl = captureCurrentFrameDataUrl();
      const triggerType = options.triggerType ?? 'button';
      const trigger = await apiClient.post('/sos/trigger', {
        trigger_type: triggerType,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        note:
          options.note ??
          (triggerType === 'hand_gesture'
            ? 'SOS kích hoạt từ chuỗi cử chỉ S-O-S.'
            : 'SOS kích hoạt từ nút bấm giao diện người dùng.'),
        evidence_data_url: evidenceDataUrl,
      });
      const confirmed = await apiClient.post('/sos/confirm', {
        sos_id: trigger.data.id,
        confirmed: true,
      });
      const finalStatus = String(confirmed.data.status ?? '');
      const isSent = finalStatus === 'sent' || finalStatus === 'confirmed';

      if (isSent) {
        setSosMessage(
          options.successMessage ??
            `Tín hiệu SOS đã được gửi. Trạng thái hiện tại: ${translateSosStatus(finalStatus)}.`,
        );
        if (soundEnabled) {
          playSosVoice('Tín hiệu SOS đã được gửi.');
        }
      } else {
        const pendingOrFailedMessage =
          finalStatus === 'failed'
            ? 'Hệ thống đã ghi nhận tín hiệu SOS nhưng gửi thất bại. Hãy kiểm tra cấu hình email hoặc lịch sử SOS.'
            : `Tín hiệu SOS đã được ghi nhận. Trạng thái hiện tại: ${translateSosStatus(finalStatus)}.`;
        setSosMessage(pendingOrFailedMessage);
        if (soundEnabled) {
          playSosVoice(
            finalStatus === 'failed'
              ? 'Gửi SOS thất bại.'
              : 'Tín hiệu SOS đã được ghi nhận.',
          );
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sos-history'] }),
        queryClient.invalidateQueries({ queryKey: ['drowsiness-events'] }),
      ]);
    } catch (error: unknown) {
      setSosMessage(getApiErrorMessage(error, 'Gửi SOS thất bại'));
      if (soundEnabled) {
        playSosVoice('Gửi SOS thất bại.');
      }
    } finally {
      setIsSendingSos(false);
    }
  }

  const drowsinessSource =
    drowsinessQuery.data && drowsinessQuery.data.length > 0
      ? drowsinessQuery.data
      : fallbackDrowsinessRows();
  const sosSource =
    sosHistoryQuery.data && sosHistoryQuery.data.length > 0
      ? sosHistoryQuery.data
      : fallbackSosRows();

  const drowsinessRows = useMemo<TableRow[]>(
    () =>
      drowsinessSource.slice(0, 6).map((item) => {
        const meta = safeParseMeta(item.meta_json);
        return {
          id: item.id,
          time: new Date(item.event_time).toLocaleString(),
          type: translateReason(String(meta?.reason ?? 'normal')),
          severity: `Mức ${item.drowsiness_level}`,
          severityTone:
            item.drowsiness_level >= 3
              ? 'danger'
              : item.drowsiness_level >= 1
                ? 'warning'
                : 'success',
          status: item.alert_triggered ? 'Đã phát cảnh báo' : 'Ghi nhận nội bộ',
          detail:
            item.alert_triggered
              ? 'Đã phát cảnh báo bằng giọng nói'
              : 'Sự kiện chỉ được lưu vào lịch sử',
        };
      }),
    [drowsinessSource],
  );

  const sosRows = useMemo<TableRow[]>(
    () =>
      sosSource.slice(0, 6).map((item) => ({
        id: item.id,
        time: new Date(item.event_time).toLocaleString(),
        type: item.trigger_type.includes('hand_gesture') ? 'SOS tay' : 'SOS nút bấm',
        severity: translateSosStatus(item.status),
        severityTone: toneForSosStatus(item.status),
        status: item.address ?? 'Không có địa chỉ',
        detail: item.status,
      })),
    [sosSource],
  );

  const drowsinessColumns: Array<EventTableColumn<TableRow>> = [
    {
      key: 'time',
      header: 'Thời gian',
      render: (row) => <span className="font-medium text-slate-700">{row.time}</span>,
    },
    {
      key: 'type',
      header: 'Loại sự kiện',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.type}</div>
          <div className="mt-1 text-xs text-slate-500">{row.detail}</div>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Mức độ',
      render: (row) => (
        <span
          className={cx(
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1',
            toneChip[row.severityTone],
          )}
        >
          {row.severity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái xử lý',
      render: (row) => <span className="text-sm text-slate-600">{row.status}</span>,
    },
  ];

  const sosColumns: Array<EventTableColumn<TableRow>> = [
    {
      key: 'time',
      header: 'Thời gian',
      render: (row) => <span className="font-medium text-slate-700">{row.time}</span>,
    },
    {
      key: 'type',
      header: 'Loại sự kiện',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink">{row.type}</div>
          <div className="mt-1 text-xs text-slate-500">{row.status}</div>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Mức độ',
      render: (row) => (
        <span
          className={cx(
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1',
            toneChip[row.severityTone],
          )}
        >
          {row.severity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái xử lý',
      render: (row) => <span className="text-sm text-slate-600">{row.status}</span>,
    },
  ];

  const drowsinessState = describeDrowsinessLevel(aiState.drowsiness_level);
  const hasDangerAlert = aiState.drowsiness_level >= 2;
  const hasWarningAlert = aiState.drowsiness_level === 1;

  const cameraStatuses = [
    {
      label: 'Camera',
      value: cameraReady ? 'Đang bật' : 'Đang tắt',
      tone: cameraReady ? ('success' as UiTone) : ('neutral' as UiTone),
    },
    {
      label: 'AI đang phân tích',
      value: cameraReady && !aiError ? 'Đang xử lý realtime' : 'Chưa sẵn sàng',
      tone: cameraReady && !aiError ? ('info' as UiTone) : ('warning' as UiTone),
    },
    {
      label: 'Cử chỉ tay',
      value: gestureIsConfident
        ? `${formatGestureLabel(detectedGesture)} - ${Math.round(aiState.sos_score * 100)}%`
        : 'Chưa đủ độ tin cậy',
      tone: gestureIsConfident
        ? detectedGesture === 's'
          ? ('warning' as UiTone)
          : ('info' as UiTone)
        : ('neutral' as UiTone),
    },
    {
      label: 'Chuỗi SOS',
      value: formatSequenceState(sosSequence.state),
      tone: sosSequence.tone,
    },
    {
      label: 'Âm thanh',
      value: soundEnabled ? 'Đang bật' : 'Đã tắt',
      tone: soundEnabled ? ('success' as UiTone) : ('neutral' as UiTone),
    },
  ];

  const cameraFooter = (
    <>
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Mức buồn ngủ hiện tại
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={cx(
                  'inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1',
                  toneChip[drowsinessState.tone],
                )}
              >
                {drowsinessState.label}
              </span>
              <span className="text-sm text-slate-600">{translateReason(aiState.reason)}</span>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Độ tin cậy cử chỉ</div>
            <div className="mt-2 text-lg font-semibold text-ink">
              {(aiState.sos_score * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Chuỗi SOS bằng tay
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['S', 'O', 'S'].map((letter, index) => {
                const active = sosSequence.letters[index] === letter;
                return (
                  <span
                    key={`${letter}-${index}`}
                    className={cx(
                      'inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ring-1',
                      active
                        ? 'bg-rose-500 text-white ring-rose-300'
                        : 'bg-slate-50 text-slate-500 ring-slate-200',
                    )}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{sosSequence.message}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>{formatSequenceState(sosSequence.state)}</div>
            {sequenceCountdown ? (
              <div className="mt-2 text-lg font-semibold text-ink">{sequenceCountdown}</div>
            ) : (
              <div className="mt-2 text-lg font-semibold text-ink">
                {(aiState.sos_stable_seconds ?? 0).toFixed(1)}s
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <MapPinned size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Vị trí hiện tại
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{locationLabel}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <CameraPanel
        title="Dashboard realtime cho người lái"
        subtitle="Camera ưu tiên nhận diện cử chỉ tay theo chuỗi S -> O -> S, đồng thời vẫn theo dõi các chỉ số buồn ngủ theo thời gian thực."
        videoRef={videoRef}
        canvasRef={canvasRef}
        statuses={cameraStatuses}
        actions={[
          {
            label: isStartingCamera ? 'Đang mở camera...' : 'Bật camera',
            onClick: () => {
              void startCamera();
            },
            disabled: isStartingCamera,
            icon: Power,
          },
          {
            label: 'Tắt camera',
            onClick: stopCamera,
            disabled: !cameraReady,
            icon: VideoOff,
          },
          {
            label: isLocating ? 'Đang lấy vị trí...' : 'Lấy vị trí',
            onClick: () => {
              void requestLocation();
            },
            disabled: isLocating,
            icon: Crosshair,
          },
          {
            label: isUpdatingSound
              ? 'Đang cập nhật âm thanh...'
              : soundEnabled
                ? 'Tắt âm thanh'
                : 'Bật âm thanh',
            onClick: () => {
              void toggleSound();
            },
            disabled: isUpdatingSound,
            icon: soundEnabled ? VolumeX : Volume2,
          },
        ]}
        onSos={() => {
          if (soundEnabled) {
            playSosVoice('Đang gửi SOS khẩn cấp.');
          }
          void handleSos({
            triggerType: 'button',
            note: 'Người dùng bấm nút SOS thủ công trên dashboard.',
            successMessage: 'Đã gửi SOS từ nút bấm khẩn cấp.',
          });
        }}
        sosLoading={isSendingSos}
        sosEmergency={hasDangerAlert || sosEmergencyActive}
        mirrorVideo
        footer={cameraFooter}
        overlay={
          <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-[24px] border border-white/10 bg-slate-950/60 px-4 py-3 text-white backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              Nhận diện cử chỉ SOS
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1',
                  gestureIsConfident
                    ? detectedGesture === 's'
                      ? 'bg-amber-300/90 text-slate-950 ring-amber-100/60'
                      : 'bg-sky-400/90 text-slate-950 ring-sky-100/60'
                    : 'bg-white/10 text-white ring-white/20',
                )}
              >
                {formatGestureLabel(detectedGesture)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                {Math.round(aiState.sos_score * 100)}%
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                {(aiState.sos_stable_seconds ?? 0).toFixed(1)}s
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                {formatSosSource(aiState.sos_source)}
              </span>
            </div>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
              MediaPipe SOS: {formatMediaPipeStage(aiState.mediapipe_sos_stage, aiState.mediapipe_sos_label)} ·{' '}
              {(aiState.mediapipe_sos_stable_seconds ?? 0).toFixed(1)}s
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-100">{sosSequence.message}</p>
            {sequenceCountdown ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                Đếm ngược: {sequenceCountdown}
              </p>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          {sequenceIsActive ? (
            <AlertBanner
              level={sosSequence.tone}
              title="Trạng thái chuỗi SOS"
              description={
                sequenceCountdown
                  ? `${sosSequence.message} Còn lại ${sequenceCountdown}.`
                  : sosSequence.message
              }
            />
          ) : null}
          {hasDangerAlert ? (
            <AlertBanner
              level="danger"
              title="Cảnh báo nguy hiểm"
              description={`${drowsinessState.description} Nguyên nhân nổi bật: ${translateReason(aiState.reason)}.`}
            />
          ) : null}
          {hasWarningAlert ? (
            <AlertBanner
              level="warning"
              title="Cảnh báo nhẹ"
              description={`${drowsinessState.description} Hãy cân nhắc nghỉ ngơi hoặc đổi tài xế nếu cần.`}
            />
          ) : null}
          {cameraError ? (
            <AlertBanner level="warning" title="Sự cố camera" description={cameraError} />
          ) : null}
          {aiError ? <AlertBanner level="danger" title="Sự cố AI" description={aiError} /> : null}
          {sosMessage ? (
            <AlertBanner
              level={normalizeSearchText(sosMessage).includes('that bai') ? 'danger' : 'success'}
              title="Trạng thái SOS"
              description={sosMessage}
            />
          ) : null}

          {soundNotice ? (
            <AlertBanner
              level={soundNotice.level}
              title="Âm thanh cảnh báo"
              description={soundNotice.message}
            />
          ) : null}
          {sosSequence.state === 'SOS_PENDING_CONFIRMATION' ? (
            <section className="card border border-amber-200/80 bg-amber-50/80 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
                  <OctagonAlert size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    Xác nhận SOS đang chờ
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Đã nhận chuỗi S-O nhưng chưa có chữ S cuối. Nếu bạn không phản hồi, hệ thống
                    sẽ tự động gửi SOS sau {sequenceCountdown ?? 'ít giây'}.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) {
                          playSosVoice('Đang gửi SOS khẩn cấp.');
                        }
                        applySosSequenceState({
                          state: 'CONFIRMED',
                          letters: ['S', 'O'],
                          message: 'Đang gửi SOS theo xác nhận thủ công của người lái.',
                          tone: 'danger',
                          deadlineAt: Date.now() + SOS_CONFIRM_BANNER_MS,
                          autoSendAt: null,
                          holdLockLabel: sosSequence.holdLockLabel,
                          cooldownUntil: Date.now() + SOS_POST_CONFIRM_COOLDOWN_MS,
                        });
                        void handleSos({
                          triggerType: 'hand_gesture',
                          note: 'Người lái xác nhận gửi SOS trong trạng thái SOS_PENDING_CONFIRMATION.',
                          successMessage: 'Đã gửi SOS theo xác nhận của người lái.',
                        });
                      }}
                      disabled={isSendingSos}
                      className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Gửi SOS ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetSosSequence(
                          'Đã hủy chuỗi SOS đang chờ xác nhận. Hệ thống quay lại trạng thái sẵn sàng.',
                        );
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">Trạng thái hệ thống</h3>
                <p className="text-sm text-slate-500">
                  Tổng hợp camera, AI buồn ngủ và chuỗi SOS bằng tay.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Camera</span>
                <span className="font-semibold text-ink">
                  {cameraReady ? 'Đã kết nối' : 'Chưa sẵn sàng'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>AI</span>
                <span className="font-semibold text-ink">
                  {cameraReady && !aiError ? 'Đang xử lý webcam frontend' : 'Chưa có dữ liệu'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Khuôn mặt</span>
                <span className="font-semibold text-ink">
                  {aiState.face_detected ? 'Đã nhận diện' : 'Chưa nhận diện'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Cử chỉ tay</span>
                <span className="font-semibold text-ink">
                  {gestureIsConfident
                    ? `${formatGestureLabel(detectedGesture)} (${aiState.sos_score.toFixed(2)}) - ${formatSosSource(aiState.sos_source)}`
                    : 'Chưa đủ tin cậy'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>MediaPipe Hands</span>
                <span className="font-semibold text-ink">
                  {aiState.mediapipe_sos_label && aiState.mediapipe_sos_label !== 'unavailable'
                    ? `${formatMediaPipeStage(aiState.mediapipe_sos_stage, aiState.mediapipe_sos_label)} (${(aiState.mediapipe_sos_stable_seconds ?? 0).toFixed(1)}s)`
                    : 'Chua co tin hieu'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Chuỗi SOS</span>
                <span className="font-semibold text-ink">{formatSequenceState(sosSequence.state)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Âm thanh</span>
                <span className="font-semibold text-ink">
                  {soundEnabled ? 'Đang bật cảnh báo giọng nói' : 'Đã tắt cảnh báo giọng nói'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3">
                <span>Ngưỡng MAR</span>
                <span className="font-semibold text-ink">
                  {((settings?.mar_threshold ?? 0.6) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <MetricBar
            label="EAR - Eye Aspect Ratio"
            value={aiState.ear}
            warning={(settings?.ear_threshold ?? 0.21) + 0.03}
            danger={settings?.ear_threshold ?? 0.21}
            direction="low"
            description="Giảm thấp kéo dài thường là dấu hiệu nhắm mắt hoặc mất tập trung."
          />
          <MetricBar
            label="MAR - Mouth Aspect Ratio"
            value={aiState.mar}
            warning={(settings?.mar_threshold ?? 0.6) * 0.92}
            danger={settings?.mar_threshold ?? 0.6}
            description="Tăng cao liên tục cho thấy ngáp hoặc mệt mỏi."
          />
          <MetricBar
            label="Tư thế đầu"
            value={Math.abs(aiState.head_pitch)}
            max={40}
            warning={(settings?.head_pose_threshold ?? 15) * 0.8}
            danger={settings?.head_pose_threshold ?? 15}
            description="Theo dõi độ cúi đầu để nhận diện gật gù hoặc mất kiểm soát tư thế."
            formatter={(value) => `${value.toFixed(1)} độ`}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Cảnh báo hôm nay"
          value={drowsinessQuery.data?.length ?? drowsinessRows.length}
          hint="Số cảnh báo buồn ngủ đã được ghi nhận trong ngày."
          icon={AlertTriangle}
          tone={hasDangerAlert ? 'danger' : 'warning'}
          trend={hasDangerAlert ? 'Realtime risk detected' : 'Theo dõi liên tục'}
        />
        <StatCard
          title="SOS đã gửi"
          value={sosHistoryQuery.data?.length ?? sosRows.length}
          hint="Bao gồm chờ xác nhận, gửi thành công và thất bại."
          icon={Siren}
          tone={sosEmergencyActive ? 'danger' : sequenceIsActive ? 'warning' : 'info'}
          trend={
            sosEmergencyActive
              ? 'SOS đang kích hoạt'
              : sequenceIsActive
                ? formatSequenceState(sosSequence.state)
                : 'Sẵn sàng phản hồi'
          }
        />
        <StatCard
          title="Trạng thái camera"
          value={cameraReady ? 'Sẵn sàng' : 'Tạm dừng'}
          hint="Frontend mở webcam và gửi khung hình trực tiếp lên backend."
          icon={cameraReady ? Camera : VideoOff}
          tone={cameraReady ? 'success' : 'neutral'}
          trend={cameraReady ? 'Live feed active' : 'Chờ người dùng bật lại'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <EventTable
          title="Lịch sử cảnh báo ngủ gật"
          subtitle="Các cảnh báo gần nhất từ phiên theo dõi hiện tại hoặc dữ liệu backend."
          rows={drowsinessRows}
          columns={drowsinessColumns}
          rowKey={(row) => row.id}
          caption="Bảng rút gọn ưu tiên các sự kiện mới nhất để tài xế kiểm tra nhanh."
        />
        <EventTable
          title="Lịch sử SOS"
          subtitle="Sự kiện SOS theo nút bấm hoặc chuỗi cử chỉ tay được hệ thống ghi nhận."
          rows={sosRows}
          columns={sosColumns}
          rowKey={(row) => row.id}
          caption="Khi backend hoạt động, lịch sử này sẽ đồng bộ theo trạng thái gửi thực tế."
        />

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white">
              <OctagonAlert size={20} />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Quy trình SOS</h3>
              <p className="text-sm text-slate-500">
                Luồng SOS mới ưu tiên chuỗi cử chỉ S - O - S.
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-4">
            {[
              'Nhận diện chữ S đầu tiên ổn định, sau đó chuyển sang chờ chữ O.',
              'Nhận đủ chữ O trong 30 giây, hệ thống tiếp tục chờ chữ S cuối.',
              'Nếu có đủ chữ S cuối, hệ thống lấy vị trí, phát cảnh báo và gửi SOS ngay.',
              'Nếu chỉ có S-O sau 2 phút, hệ thống mở cửa sổ xác nhận và tự động gửi sau 10-15 giây nếu không có phản hồi.',
            ].map((step, index) => (
              <li key={step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  {index < 3 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                </div>
                <div className="pb-4">
                  <p className="text-sm leading-6 text-slate-700">{step}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
