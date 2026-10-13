import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { OBSERVING_MESSAGE } from '../config/expressions.ts';
import { useAudioPlayer } from '../hooks/useAudioPlayer.ts';
import { useCamera } from '../hooks/useCamera.ts';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker.ts';
import { useRuntimeSettings } from '../hooks/useRuntimeSettings.ts';
import { faceBounds, shouldPromptCloser } from '../services/blendshapes.ts';
import { classifyBlendshapes } from '../services/expressionClassifier.ts';
import { ExpressionStabilizer, type StabilizerOutput } from '../services/expressionStabilizer.ts';
import { emptyPickerState, isMusicalExpression, pickMessage, pickNextTrack, type PickerState } from '../services/musicEngine.ts';
import { createVisitorSession, rotateVisitor, type VisitorSession } from '../services/sessionManager.ts';
import type { AppPhase, ClassificationFrame, DetectionFrame, ExpressionId, MusicTrack, RuntimeSettings } from '../types/index.ts';
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
  const [output, setOutput] = useState<StabilizerOutput | null>(null);
  const [classification, setClassification] = useState<ClassificationFrame | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [frame, setFrame] = useState<DetectionFrame | null>(null);
  const [closerHint, setCloserHint] = useState(false);
  const [visitor, setVisitor] = useState<VisitorSession>(() => createVisitorSession(Date.now()));
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const pickerRef = useRef<PickerState>(emptyPickerState());
  const revisionRef = useRef(0);
  const displayRef = useRef<ExpressionId | null>(null);
  const messageRef = useRef<string | null>(null);
  const duckRef = useRef(false);

  const clearPresentation = useCallback(() => {
    pickerRef.current = emptyPickerState();
    displayRef.current = null;
    messageRef.current = null;
    duckRef.current = false;
    setMessage(null);
    setClassification(null);
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
    (expression: StabilizerOutput['musicExpression'], settings: RuntimeSettings) => {
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

  const onFrame = useCallback(
    (detection: DetectionFrame) => {
      const settings = settingsRef.current;
      const classified = classifyBlendshapes(detection.blendshapes, settings.thresholds, detection.faceCount);
      const next = stabilizer.push(
        {
          expression: classified.expression,
          scores: classified.scores,
          margin: classified.margin,
        },
        Date.now(),
      );
      setFrame(detection);
      setClassification(classified);
      setOutput(next);
      setCloserHint(shouldPromptCloser(faceBounds(detection.landmarks)));

      if (next.sessionReset) {
        clearPresentation();
        setVisitor((current) => rotateVisitor(current, Date.now()));
        void audioRef.current.stop();
      }

      if (next.debug.musicRevision !== revisionRef.current) {
        revisionRef.current = next.debug.musicRevision;
        if (!next.sessionReset) playExpression(next.musicExpression, settings);
      }

      if (next.duckAudio && !duckRef.current) {
        duckRef.current = true;
        void audioRef.current.duck();
      } else if (!next.duckAudio) {
        duckRef.current = false;
      }

      if (!next.observing) {
        if (displayRef.current !== next.displayExpression) {
          displayRef.current = next.displayExpression;
          const text = pickMessage(settings.messages[next.displayExpression], messageRef.current);
          messageRef.current = text;
          setMessage(text);
        }
      }
    },
    [clearPresentation, playExpression, stabilizer],
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
    void audioRef.current.unlock();
    const now = Date.now();
    const blank = stabilizer.reset(now);
    revisionRef.current = stabilizer.revision;
    clearPresentation();
    setOutput(blank);
    setVisitor((current) => rotateVisitor(current, now));
    setLifecycle('running');
    setPermissionPending(true);
    setAnalysisOn(false);
    camera.clearError();
    setCameraAttempt((value) => value + 1);
  }, [camera, clearPresentation, stabilizer]);

  const stop = useCallback(() => {
    setAnalysisOn(false);
    setPermissionPending(false);
    setLifecycle('stopped');
    camera.stop();
    void audioRef.current.stop();
  }, [camera]);

  const retry = useCallback(() => {
    camera.clearError();
    if (analysis.error) analysis.retry();
    setLifecycle('running');
    setPermissionPending(true);
    setAnalysisOn(false);
    setCameraAttempt((value) => value + 1);
  }, [analysis, camera]);

  const newVisitor = useCallback(() => {
    const now = Date.now();
    const blank = stabilizer.reset(now);
    revisionRef.current = stabilizer.revision;
    clearPresentation();
    setOutput(blank);
    setVisitor((current) => rotateVisitor(current, now));
    void audioRef.current.stop();
  }, [clearPresentation, stabilizer]);

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
    const expression = output?.musicExpression;
    if (!expression) return;
    playExpression(expression, settingsRef.current);
  }, [output?.musicExpression, playExpression]);

  const testMusic = useCallback(() => {
    const tracks = resolveTracks(settingsRef.current.tracks, previewsRef.current);
    const track = tracks.find((item) => item.expression === 'happy') ?? tracks[0];
    if (!track) return;
    void audioRef.current.unlock();
    void audioRef.current.playTrack(track);
  }, []);

  const phase = resolvePhase({
    lifecycle,
    permissionPending,
    modelReady: analysis.ready,
    cameraError: camera.error,
    modelError: analysis.error,
    duckAudio: output?.duckAudio ?? false,
    musicActive: Boolean(output?.musicExpression),
  });

  const activeMessage = resolveVisibleMessage(output, message, settingsApi.settings);
  const errorText = camera.error ?? analysis.error;

  return {
    phase,
    phaseLabel: PHASE_LABEL[phase],
    settings: settingsApi.settings,
    settingsNotice: settingsApi.notice,
    devices: camera.devices,
    deviceId: camera.deviceId,
    landmarks: frame?.landmarks ?? [],
    classification,
    output,
    message: activeMessage,
    closerHint,
    audioTitle: audio.snapshot.track?.title ?? 'İfade kararlı olunca müzik seçilir',
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
  output: StabilizerOutput | null,
  message: string | null,
  settings: RuntimeSettings,
): string {
  if (!output || output.observing) return OBSERVING_MESSAGE;
  const list = settings.messages[output.displayExpression];
  if (message && list.includes(message)) return message;
  return list[0] ?? OBSERVING_MESSAGE;
}
