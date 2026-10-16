import { useRef } from 'react';
import { CameraView } from '../components/CameraView.tsx';
import { CampusMoodDashboard } from '../components/CampusMoodDashboard.tsx';
import { DebugPanel } from '../components/DebugPanel.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';
import { ExpressionCard } from '../components/ExpressionCard.tsx';
import { MusicPlayer } from '../components/MusicPlayer.tsx';
import { SettingsPanel } from '../components/SettingsPanel.tsx';
import { WaitingOverlay } from '../components/WaitingOverlay.tsx';
import { WelcomeScreen } from '../components/WelcomeScreen.tsx';
import { useMoodSession } from './useMoodSession.ts';

export default function App() {
  return (
    <ErrorBoundary>
      <MoodPlay />
    </ErrorBoundary>
  );
}

function MoodPlay() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const session = useMoodSession(rootRef, videoRef);
  const showWelcome = session.phase === 'idle' || session.phase === 'stopped';
  const trackReady = true;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-950 text-slate-100" ref={rootRef}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <p className="text-lg font-semibold text-white">MoodPlay AI</p>
        <div className="flex flex-wrap justify-end gap-2">
          {!showWelcome ? (
            <button className="min-h-11 rounded-full border border-white/15 px-4" data-testid="new-visitor" onClick={session.newVisitor} type="button">
              Yeni ziyaretçi
            </button>
          ) : null}
          <button className="min-h-11 rounded-full border border-white/15 px-4" data-testid="fullscreen-button" onClick={() => void session.toggleFullscreen()} type="button">
            {session.fullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
          </button>
          <button className="min-h-11 rounded-full border border-white/15 px-4" data-testid="settings-button" onClick={() => session.setSettingsOpen(true)} type="button">
            Ayarlar
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-10">
        {session.fullscreenError ? (
          <p className="mb-4 rounded-2xl bg-amber-300/15 px-4 py-3 text-amber-100" role="alert">
            {session.fullscreenError}
          </p>
        ) : null}
        {showWelcome ? (
          <div className="space-y-10">
            <WelcomeScreen onStart={session.start} stopped={session.phase === 'stopped'} />
            <div className="mx-auto max-w-3xl">
              <CampusMoodDashboard
                compact
                onReset={session.campusStats.resetStats}
                stats={session.campusStats.stats}
              />
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.8fr)]">
            <div className="relative min-w-0">
              <CameraView
                closerHint={session.closerHint}
                deviceId={session.deviceId}
                devices={session.devices}
                landmarks={session.landmarks}
                mirror={session.settings.mirrorVideo}
                onDeviceChange={session.changeDevice}
                onStop={session.stop}
                showOverlay={session.settings.showOverlay}
                statusText={session.phaseLabel}
                videoRef={videoRef}
              />
              {session.phase === 'no_face' ? <WaitingOverlay message={session.message} /> : null}
            </div>
            <div className="grid gap-4">
              {session.errorText ? (
                <div className="rounded-3xl border border-rose-300/30 bg-rose-400/10 p-5" data-testid="error-banner" role="alert">
                  <p className="text-lg text-rose-50">{session.errorText}</p>
                  <button className="mt-4 min-h-11 rounded-full bg-white px-4 font-semibold text-slate-950" onClick={session.retry} type="button">
                    Yeniden dene
                  </button>
                </div>
              ) : null}
              {session.audioError ? (
                <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" role="alert">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-amber-200">Sesi Açmak İçin Dokunun</p>
                    <p className="text-sm text-amber-100/90">{session.audioError}</p>
                  </div>
                  <button
                    className="min-h-11 shrink-0 rounded-full bg-amber-400 px-5 font-bold text-slate-950 shadow-md hover:bg-amber-300 transition-colors"
                    onClick={session.togglePlayback}
                    type="button"
                  >
                    Sesi Başlat
                  </button>
                </div>
              ) : null}
              <ExpressionCard
                expression={session.output?.displayExpression ?? 'unknown'}
                message={session.message}
                observing={session.output?.observing ?? session.phase !== 'no_face'}
              />
              <MusicPlayer
                canControl={trackReady}
                error={session.audioError}
                muted={session.audioMuted}
                onMuted={session.setMuted}
                onNext={session.nextTrack}
                onToggle={session.togglePlayback}
                onVolume={session.setVolume}
                playing={session.audioPlaying}
                title={session.audioTitle}
                volume={session.audioVolume}
              />
              <CampusMoodDashboard
                onReset={session.campusStats.resetStats}
                stats={session.campusStats.stats}
              />
              {session.showDebug ? (
                <DebugPanel
                  classification={session.classification}
                  delegate={session.delegate}
                  output={session.output}
                  perf={session.perf}
                />
              ) : null}
            </div>
          </div>
        )}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-sm text-slate-400">
        Ziyaretçi {session.visitor.id}. Görüntüler ve landmark verisi saklanmaz.
      </footer>
      {session.settingsOpen ? (
        <SettingsPanel
          notice={session.settingsNotice}
          onChange={session.updateSettings}
          onClose={() => session.setSettingsOpen(false)}
          onNotice={session.setSettingsNotice}
          onPreview={session.setPreview}
          onReplace={session.replaceSettings}
          onReset={session.resetSettings}
          onTestMusic={session.testMusic}
          settings={session.settings}
        />
      ) : null}
    </div>
  );
}
