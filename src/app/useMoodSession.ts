import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { OBSERVING_MESSAGE } from '../config/expressions.ts';
import { useAudioPlayer } from '../hooks/useAudioPlayer.ts';
import { useCamera } from '../hooks/useCamera.ts';
import { useCampusMoodStats, type UseCampusMoodStatsResult } from '../hooks/useCampusMoodStats.ts';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker.ts';
import { useRuntimeSettings } from '../hooks/useRuntimeSettings.ts';
import { faceBounds, shouldPromptCloser } from '../services/blendshapes.ts';
import { classifyBlendshapes } from '../services/expressionClassifier.ts';
import { ExpressionStabilizer, type StabilizerOutput } from '../services/expressionStabilizer.ts';
import { emptyPickerState, isMusicalExpression, pickMessage, pickNextTrack, type PickerState } from '../services/musicEngine.ts';
import { createVisitorSession, rotateVisitor, type VisitorSession } from '../services/sessionManager.ts';
import type { AppPhase, CategoryScores, ClassificationFrame, DetectionFrame, ExpressionId, MusicTrack, RuntimeSettings } from '../types/index.ts';
import { PHASE_LABEL, resolvePhase } from './resolvePhase.ts';

export interface MoodSession {
  phase: AppPhase;
  phaseLabel: string;
  settings: RuntimeSettings;
  settingsNotice: string | null;
  devices: MediaDeviceInfo[];
  deviceId: string;
  landmarks: DetectionFrame['landmarks'];
  classification: ClassificationFrame | null;
  output: StabilizerOutput | null;
  message: string;
  closerHint: boolean;
  campusStats: UseCampusMoodStatsResult;
  audioTitle: string;
  audioPlaying: boolean;
  audioError: string | null;
  audioVolume: number;
  audioMuted: boolean;
  visitor: VisitorSession;
  fullscreen: boolean;
  fullscreenError: string | null;
  settingsOpen: boolean;
  showDebug: boolean;
  errorText: string | null;
  delegate: DetectionFrame['delegate'] | null;
  perf: DetectionFrame['perf'] | null;

  // 5 saniyelik geri sayım ve anlık fotoğraf/ifade yakalama
  countdown: number | null;
  isCountingDown: boolean;
  capturedExpression: ExpressionId | null;
  captureStatus: 'idle' | 'counting' | 'captured' | 'no_face';
  flashActive: boolean;
  startCountdown: () => void;
  cancelCountdown: () => void;

  start: () => void;
  stop: () => void;
  retry: () => void;
  newVisitor: () => void;
  toggleFullscreen: () => Promise<void>;
  setSettingsOpen: (open: boolean) => void;
  updateSettings: (recipe: (current: RuntimeSettings) => RuntimeSettings) => void;
  replaceSettings: (settings: RuntimeSettings) => void;
  resetSettings: () => void;
  setSettingsNotice: (notice: string | null) => void;
  setPreview: (trackId: string, file: File) => void;
  changeDevice: (deviceId: string) => void;
  togglePlayback: () => void;
  nextTrack: () => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  testMusic: () => void;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Tarayıcı audio context kısıtlıysa sessizce devam eder
  }
}

export function useMoodSession(
  rootRef: RefObject<HTMLDivElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
): MoodSession {
  const settingsApi = useRuntimeSettings();
  const settingsRef = useRef(settingsApi.settings);
  const previewsRef = useRef(settingsApi.previews);

  const camera = useCamera(videoRef);
  const audio = useAudioPlayer(settingsApi.settings.fadeMs);
  const audioRef = useRef(audio);
  const campusStats = useCampusMoodStats();

  useEffect(() => {
    settingsRef.current = settingsApi.settings;
    previewsRef.current = settingsApi.previews;
    audioRef.current = audio;
  }, [audio, settingsApi.previews, settingsApi.settings]);

  const [stabilizer] = useState(() => new ExpressionStabilizer(settingsApi.settings.stabilizer));
  const [lifecycle, setLifecycle] = useState<'idle' | 'running' | 'stopped'>('idle');
  const [permissionPending, setPermissionPending] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [analysisOn, setAnalysisOn] = useState(false);
  const [classification, setClassification] = useState<ClassificationFrame | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [frame, setFrame] = useState<DetectionFrame | null>(null);
  const [closerHint, setCloserHint] = useState(false);
  const [visitor, setVisitor] = useState<VisitorSession>(() => createVisitorSession(Date.now()));
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  // 5sn geri sayım durumları
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [capturedExpression, setCapturedExpression] = useState<ExpressionId | null>(null);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'counting' | 'captured' | 'no_face'>('idle');
  const [flashActive, setFlashActive] = useState(false);

  const countdownTimerRef = useRef<number | null>(null);
  const countdownSamplesRef = useRef<Array<{ expression: ExpressionId; scores: CategoryScores; t: number }>>([]);
  const latestClassificationRef = useRef<ClassificationFrame | null>(null);
  const latestFaceCountRef = useRef<number>(0);

  const pickerRef = useRef<PickerState>(emptyPickerState());
  const revisionRef = useRef(0);
  const displayRef = useRef<ExpressionId | null>(null);
  const messageRef = useRef<string | null>(null);
  const lifecycleRef = useRef<'idle' | 'running' | 'stopped'>('idle');
  const userPausedAudioRef = useRef(false);

  const clearPresentation = useCallback(() => {
    pickerRef.current = emptyPickerState();
    displayRef.current = null;
    messageRef.current = null;
    setMessage(null);
    setClassification(null);
    setCapturedExpression(null);
    setCaptureStatus('idle');
    setCountdown(null);
    setIsCountingDown(false);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setIsCountingDown(false);
    setCountdown(null);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stabilizer.updateConfig(settingsApi.settings.stabilizer);
    audioRef.current.setFadeMs(settingsApi.settings.fadeMs);
    audioRef.current.setVolume(settingsApi.settings.volume);
    audioRef.current.setMuted(settingsApi.settings.muted);
  }, [settingsApi.settings, stabilizer]);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [rootRef]);

  const playExpression = useCallback(
    (expression: ExpressionId | null, settings: RuntimeSettings) => {
      if (userPausedAudioRef.current || lifecycleRef.current !== 'running') {
        return;
      }
      if (!expression || !isMusicalExpression(expression)) {
        void audioRef.current.stop();
        return;
      }
      const picked = pickNextTrack(
        resolveTracks(settings.tracks, previewsRef.current),
        expression,
        settings.musicSelection,
        pickerRef.current,
      );
      pickerRef.current = picked.state;
      if (!picked.track) {
        setLibraryError('Bu ifade için tanımlı bir parça yok. Ayarlardan bir yol ekleyin.');
        return;
      }
      setLibraryError(null);
      void audioRef.current.playTrack(picked.track);
    },
    [setLibraryError],
  );

  const performCapture = useCallback(() => {
    cancelCountdown();
    setFlashActive(true);
    playTone(880, 0.25, 'triangle');
    setTimeout(() => setFlashActive(false), 150);

    const now = Date.now();
    // Son 1200ms içindeki yüz örneklerini topla
    const recent = countdownSamplesRef.current.filter((item) => item.t >= now - 1200);
    const validFaces = recent.filter((item) => item.expression !== 'no_face' && item.expression !== 'unknown');

    let winner: ExpressionId = 'neutral';
    if (validFaces.length === 0) {
      // Anlık classification kontrolü
      if (
        latestClassificationRef.current &&
        latestClassificationRef.current.expression !== 'no_face' &&
        latestClassificationRef.current.expression !== 'unknown'
      ) {
        winner = latestClassificationRef.current.expression;
      } else {
        // Yüz algılanamadı
        setCaptureStatus('no_face');
        setMessage('Kamerada yüz algılanamadı! Lütfen tam karşıya geçip butona tekrar basın.');
        return;
      }
    } else {
      // Örnekler arasında baskın olan duyguyu hesapla
      const counts: Record<string, number> = {
        happy: 0,
        brow_furrow: 0,
        disgust: 0,
        sad: 0,
        surprised: 0,
        neutral: 0,
      };
      for (const sample of validFaces) {
        if (counts[sample.expression] !== undefined) {
          counts[sample.expression] += 1;
        }
      }
      let topCount = -1;
      let topExp: ExpressionId = 'neutral';
      for (const [exp, c] of Object.entries(counts)) {
        if (c > topCount) {
          topCount = c;
          topExp = exp as ExpressionId;
        }
      }
      winner = topExp;
    }

    setCaptureStatus('captured');
    setCapturedExpression(winner);
    displayRef.current = winner;

    const list = settingsRef.current.messages[winner] ?? [];
    const text = pickMessage(list, messageRef.current);
    messageRef.current = text;
    setMessage(text);

    campusStats.recordMood(winner);

    // Kilitlenen ifadeye uygun parçayı çal
    userPausedAudioRef.current = false;
    playExpression(winner, settingsRef.current);
  }, [cancelCountdown, campusStats, playExpression]);

  const startCountdown = useCallback(() => {
    if (lifecycleRef.current !== 'running' || isCountingDown) return;
    void audioRef.current.unlock();
    cancelCountdown();
    countdownSamplesRef.current = [];
    setIsCountingDown(true);
    setCaptureStatus('counting');
    setCountdown(5);
    playTone(600, 0.08);

    let remaining = 5;
    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        playTone(600, 0.08);
      } else {
        clearInterval(interval);
        countdownTimerRef.current = null;
        performCapture();
      }
    }, 1000);

    countdownTimerRef.current = interval;
  }, [cancelCountdown, isCountingDown, performCapture]);

  const onFrame = useCallback(
    (detection: DetectionFrame) => {
      if (lifecycleRef.current !== 'running') return;
      const settings = settingsRef.current;
      const classified = classifyBlendshapes(detection.blendshapes, settings.thresholds, detection.faceCount);
      latestClassificationRef.current = classified;
      latestFaceCountRef.current = detection.faceCount;

      setFrame(detection);
      setClassification(classified);
      setCloserHint(shouldPromptCloser(faceBounds(detection.landmarks)));

      const now = Date.now();
      countdownSamplesRef.current.push({
        expression: classified.expression,
        scores: classified.scores,
        t: now,
      });
      if (countdownSamplesRef.current.length > 120) {
        countdownSamplesRef.current.shift();
      }

      // "anlık değişim olmasın":
      // Frame geldikçe müzik otomatik DEĞİŞTİRİLMEZ!
      // Sadece geri sayım tamamlanıp performCapture çağrıldığında ifade kilitlenir.
    },
    [],
  );

  const analysis = useFaceLandmarker({
    videoRef,
    enabled: analysisOn,
    onFrame,
  });

  const { start: startCamera } = camera;

  useEffect(() => {
    if (lifecycle !== 'running' || !permissionPending) return;
    let cancelled = false;
    void startCamera().then((stream) => {
      if (cancelled || !stream) return;
      setPermissionPending(false);
      setAnalysisOn(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cameraAttempt, lifecycle, permissionPending, startCamera]);

  const start = useCallback(() => {
    lifecycleRef.current = 'running';
    userPausedAudioRef.current = true;
    void audioRef.current.unlock();
    const now = Date.now();
    cancelCountdown();
    clearPresentation();
    setVisitor((current) => rotateVisitor(current, now));
    setLifecycle('running');
    setPermissionPending(true);
    setAnalysisOn(false);
    camera.clearError();
    setCameraAttempt((value) => value + 1);
  }, [camera, cancelCountdown, clearPresentation]);

  const stop = useCallback(() => {
    lifecycleRef.current = 'stopped';
    userPausedAudioRef.current = true;
    cancelCountdown();
    setAnalysisOn(false);
    setPermissionPending(false);
    setLifecycle('stopped');
    camera.stop();
    void audioRef.current.stop();
  }, [camera, cancelCountdown]);

  const retry = useCallback(() => {
    lifecycleRef.current = 'running';
    userPausedAudioRef.current = true;
    cancelCountdown();
    camera.clearError();
    if (analysis.error) analysis.retry();
    setLifecycle('running');
    setPermissionPending(true);
    setAnalysisOn(false);
    setCameraAttempt((value) => value + 1);
  }, [analysis, camera, cancelCountdown]);

  const newVisitor = useCallback(() => {
    const now = Date.now();
    cancelCountdown();
    clearPresentation();
    setVisitor((current) => rotateVisitor(current, now));
    void audioRef.current.stop();
  }, [cancelCountdown, clearPresentation]);

  const toggleFullscreen = useCallback(async () => {
    const node = rootRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (typeof node.requestFullscreen === 'function') await node.requestFullscreen();
      else setFullscreenError('Bu tarayıcı tam ekranı desteklemiyor.');
    } catch {
      setFullscreenError('Tarayıcı tam ekran isteğini reddetti.');
    }
  }, [rootRef]);

  const changeDevice = useCallback(
    (nextDeviceId: string) => {
      camera.setDeviceId(nextDeviceId);
      if (lifecycle === 'running' && !permissionPending) void camera.start(nextDeviceId);
    },
    [camera, lifecycle, permissionPending],
  );

  const nextTrack = useCallback(() => {
    if (audioRef.current.isTransitioning()) return;
    userPausedAudioRef.current = false;
    const expression = capturedExpression ?? 'neutral';
    playExpression(expression, settingsRef.current);
  }, [capturedExpression, playExpression]);

  const testMusic = useCallback(() => {
    userPausedAudioRef.current = false;
    const tracks = resolveTracks(settingsRef.current.tracks, previewsRef.current);
    const track = tracks.find((item) => item.expression === 'happy') ?? tracks[0];
    if (!track) return;
    void audioRef.current.playTrack(track);
  }, []);

  const phase = resolvePhase({
    lifecycle,
    permissionPending,
    modelReady: analysis.ready,
    cameraError: camera.error,
    modelError: analysis.error,
    duckAudio: false,
    musicActive: Boolean(capturedExpression && audio.snapshot.playing),
  });

  const effectiveOutput: StabilizerOutput = {
    observing: captureStatus !== 'captured',
    displayExpression: capturedExpression ?? (captureStatus === 'no_face' ? 'no_face' : 'unknown'),
    stableExpression: capturedExpression,
    musicExpression: capturedExpression && isMusicalExpression(capturedExpression) ? capturedExpression : null,
    duckAudio: false,
    sessionReset: false,
    debug: {
      windowCounts: {},
      candidate: null,
      candidateHeldMs: 0,
      observationElapsedMs: 0,
      cooldownRemainingMs: 0,
      musicRevision: revisionRef.current,
      pendingMusic: false,
    },
  };

  const activeMessage = resolveVisibleMessage(
    captureStatus,
    countdown,
    capturedExpression,
    effectiveOutput,
    message,
    settingsApi.settings,
  );
  const errorText = camera.error ?? analysis.error;

  return {
    phase,
    phaseLabel: isCountingDown ? `Geri sayılıyor (${countdown}s)` : PHASE_LABEL[phase],
    settings: settingsApi.settings,
    settingsNotice: settingsApi.notice,
    devices: camera.devices,
    deviceId: camera.deviceId,
    landmarks: frame?.landmarks ?? [],
    classification,
    output: effectiveOutput,
    message: activeMessage,
    closerHint,
    campusStats,
    audioTitle: audio.snapshot.track?.title ?? (capturedExpression ? 'Parça seçildi' : 'Duygumu Analiz Et butonuna basın'),
    audioPlaying: audio.snapshot.playing,
    audioError: libraryError ?? audio.snapshot.error,
    audioVolume: settingsApi.settings.volume,
    audioMuted: settingsApi.settings.muted,
    visitor,
    fullscreen,
    fullscreenError,
    settingsOpen,
    showDebug: settingsApi.settings.showDebug && !fullscreen,
    errorText,
    delegate: frame?.delegate ?? null,
    perf: frame?.perf ?? null,

    // Geri sayım özellikleri
    countdown,
    isCountingDown,
    capturedExpression,
    captureStatus,
    flashActive,
    startCountdown,
    cancelCountdown,

    start,
    stop,
    retry,
    newVisitor,
    toggleFullscreen,
    setSettingsOpen,
    updateSettings: settingsApi.update,
    replaceSettings: settingsApi.setSettings,
    resetSettings: settingsApi.resetDefaults,
    setSettingsNotice: settingsApi.setNotice,
    setPreview: settingsApi.setPreview,
    changeDevice,
    togglePlayback: () => {
      const snap = audioRef.current.snapshot;
      if (snap.playing) {
        userPausedAudioRef.current = true;
        void audioRef.current.toggle();
        return;
      }
      userPausedAudioRef.current = false;
      const currentTrack = snap.track;
      const isError = snap.status === 'error';
      if (!currentTrack || isError) {
        const tracks = resolveTracks(settingsRef.current.tracks, previewsRef.current);
        const targetExp = capturedExpression ?? 'neutral';
        const track = tracks.find((item) => item.expression === targetExp) ?? tracks[0];
        if (track) void audioRef.current.playTrack(track);
        return;
      }
      void audioRef.current.toggle();
    },
    nextTrack,
    setVolume: (volume: number) => {
      settingsApi.update((current) => ({ ...current, volume }));
    },
    setMuted: (muted: boolean) => {
      settingsApi.update((current) => ({ ...current, muted }));
    },
    testMusic,
  };
}

function resolveTracks(tracks: MusicTrack[], previews: Record<string, string>): MusicTrack[] {
  return tracks.map((track) => {
    const preview = previews[track.id];
    return preview ? { ...track, src: preview } : track;
  });
}

function resolveVisibleMessage(
  captureStatus: 'idle' | 'counting' | 'captured' | 'no_face',
  countdown: number | null,
  capturedExpression: ExpressionId | null,
  output: StabilizerOutput | null,
  message: string | null,
  settings: RuntimeSettings,
): string {
  if (captureStatus === 'idle') {
    return 'Butona basın, 5 saniye içinde kameraya ifadenizi gösterin!';
  }
  if (captureStatus === 'counting') {
    return `${countdown ?? 5} saniye kaldı! Mimiklerinizi kameraya gösterin...`;
  }
  if (captureStatus === 'no_face') {
    return 'Kamerada yüz bulunamadı! Lütfen tam karşıya geçip tekrar butona basın.';
  }
  if (capturedExpression) {
    const list = settings.messages[capturedExpression] ?? [];
    if (message && list.includes(message)) return message;
    return list[0] ?? OBSERVING_MESSAGE;
  }
  if (!output || output.observing) return OBSERVING_MESSAGE;
  const list = settings.messages[output.displayExpression];
  if (message && list.includes(message)) return message;
  return list[0] ?? OBSERVING_MESSAGE;
}
