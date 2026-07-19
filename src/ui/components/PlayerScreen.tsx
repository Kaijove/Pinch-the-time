// Split-view stage with the velocity HUD:
//   LEFT  — live webcam (mirrored) + custom hand visualization
//   RIGHT — the user's video + velocity readout + time thread progress
//           + YouTube-style mouse controls (seek, volume, fullscreen)
// Golden rule stays: ZERO setState per frame. Everything realtime is
// updated via refs directly from engine events. Mouse controls are
// user-driven and infrequent, so plain React state is fine for those.

import { useEffect, useRef, useState } from 'react';
import { Engine } from '../../core/engine/Engine';
import type { AppState, DebugData, HandFrame } from '../../core/events/EventBus';
import { drawHandOverlay } from './handOverlay';
import { velocityColor } from '../velocityColor';
import styles from './PlayerScreen.module.css';

interface Props {
  videoUrl: string;
  onExit: () => void;
}

function formatTime(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Minimal line-icon set matching the app's thin geometric branding.
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const PlayIcon = () => (
  <svg {...iconProps}><path d="M7 4l13 8-13 8V4z" /></svg>
);
const PauseIcon = () => (
  <svg {...iconProps}><path d="M7 4v16M17 4v16" /></svg>
);
const SkipBackIcon = () => (
  <svg {...iconProps}>
    <path d="M11 5l-8 7 8 7V5z" />
    <path d="M21 5l-8 7 8 7V5z" />
  </svg>
);
const SkipForwardIcon = () => (
  <svg {...iconProps}>
    <path d="M13 5l8 7-8 7V5z" />
    <path d="M3 5l8 7-8 7V5z" />
  </svg>
);
const VolumeIcon = () => (
  <svg {...iconProps}>
    <path d="M4 9v6h4l5 5V4L8 9H4z" />
    <path d="M16.5 8.5a5 5 0 010 7" />
    <path d="M19 5.5a9 9 0 010 13" />
  </svg>
);
const MuteIcon = () => (
  <svg {...iconProps}>
    <path d="M4 9v6h4l5 5V4L8 9H4z" />
    <path d="M16 9l5 6M21 9l-5 6" />
  </svg>
);
const FullscreenIcon = () => (
  <svg {...iconProps}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);
const FullscreenExitIcon = () => (
  <svg {...iconProps}>
    <path d="M9 4v5H4M15 4v5h5M4 15h5v5M20 15h-5v5" />
  </svg>
);

export function PlayerScreen({ videoUrl, onExit }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const trackDotRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const lastDebug = useRef<DebugData | null>(null);
  const draggingRef = useRef(false);
  const mutedRef = useRef(false);

  const [engineState, setEngineState] = useState<AppState | 'WAITING'>(
    'WAITING'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    const video = videoRef.current;
    if (!video || engineRef.current) return;

    const engine = new Engine(video);
    engineRef.current = engine;
    engine.setVolume(muted ? 0 : volume);

    engine.bus.on('stateChange', (s) => {
      setEngineState(s);
      const dot = trackDotRef.current;
      if (dot) dot.dataset.state = s === 'TRACKING' ? 'on' : 'off';
    });
    engine.bus.on('error', (msg) => setErrorMsg(msg));

    engine.bus.on('handFrame', (frame: HandFrame | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawHandOverlay(ctx, frame, lastDebug.current?.velocity ?? 1);
    });

    engine.bus.on('debugData', (d) => {
      lastDebug.current = d;
      const color = velocityColor(d.velocity);

      if (speedRef.current) {
        speedRef.current.textContent = `${d.velocity >= 0 ? '+' : '−'}${Math.abs(
          d.velocity
        ).toFixed(2)}×`;
        speedRef.current.style.color = color;
        speedRef.current.style.textShadow = `0 0 24px ${velocityColor(
          d.velocity,
          0.5
        )}`;
      }
      if (progressRef.current && d.duration > 0 && !draggingRef.current) {
        progressRef.current.style.width = `${(d.time / d.duration) * 100}%`;
        progressRef.current.style.background = color;
        progressRef.current.style.boxShadow = `0 0 10px ${velocityColor(
          d.velocity,
          0.6
        )}`;
      }
      if (debugRef.current) {
        debugRef.current.textContent = `pinch ${d.smoothPinch.toFixed(
          2
        )} · ${Math.round(d.fps)} fps`;
      }
      if (timeRef.current) {
        timeRef.current.textContent = `${formatTime(d.time)} / ${formatTime(d.duration)}`;
      }
    });

    await engine.start();

    const unmute = () => {
      const v = videoRef.current;
      // Only auto-unmute the "blocked autoplay" fallback — never override
      // a mute the user chose explicitly via the volume control.
      if (v && !mutedRef.current) v.muted = false;
    };
    document.addEventListener('pointerdown', unmute, { once: true });

    // Mount the live camera feed into the left panel
    const camEl = engine.cameraElement;
    const wrap = camWrapRef.current;
    if (wrap && !wrap.contains(camEl)) {
      camEl.className = styles.camVideo;
      wrap.prepend(camEl);
      const updateAspect = () => {
        if (camEl.videoWidth > 0) {
          wrap.style.aspectRatio = `${camEl.videoWidth} / ${camEl.videoHeight}`;
        }
      };
      updateAspect();
      camEl.addEventListener('loadedmetadata', updateAspect);
    }
  };

  // Keep the overlay canvas resolution in sync with its displayed size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Native play/pause state, and a plain timeupdate readout that works
  // even before hand tracking has started (mouse-only preview/scrub).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (timeRef.current && !draggingRef.current) {
        timeRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
      if (progressRef.current && video.duration > 0 && !draggingRef.current) {
        progressRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
    };
    const onLoadedMeta = () => onTimeUpdate();

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMeta);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, []);

  // Apply volume/mute to the raw element (works pre-engine) and to the
  // engine's audio graphs (forward native volume + reversed-audio gain).
  useEffect(() => {
    mutedRef.current = muted;
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      if (!engineRef.current) video.volume = volume;
    }
    engineRef.current?.setVolume(muted ? 0 : volume);
  }, [volume, muted]);

  // Fullscreen state, driven by the actual browser fullscreen element so
  // it also updates correctly on Escape or external changes.
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = () => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (engine) {
      const paused = engine.togglePause();
      setIsPlaying(!paused);
    } else if (video) {
      // Engine not started yet: plain fallback.
      if (video.paused) void video.play();
      else video.pause();
    }
  };

  const toggleMute = () => setMuted((m) => !m);

  // Full keyboard control, YouTube-style: space to play/pause, arrows to
  // seek/adjust volume, M to mute, F for fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((v) => {
            const next = Math.min(1, v + 0.1);
            if (next > 0 && muted) setMuted(false);
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [muted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0 && muted) setMuted(false);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  // Seek by mouse: click-to-seek and drag-to-scrub on the progress bar.
  const seekToClientX = (clientX: number) => {
    const track = progressTrackRef.current;
    const video = videoRef.current;
    if (!track || !video || !isFinite(video.duration) || video.duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = frac * video.duration;

    if (progressRef.current) progressRef.current.style.width = `${frac * 100}%`;
    if (timeRef.current) {
      timeRef.current.textContent = `${formatTime(time)} / ${formatTime(video.duration)}`;
    }

    if (engineRef.current) engineRef.current.seek(time);
    else video.currentTime = time;
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekToClientX(e.clientX);
  };
  const handleSeekPointerUp = () => {
    draggingRef.current = false;
  };

  // ±15s skip, YouTube-style. Reuses the same seek path as the progress
  // bar so it works whether the engine is driving playback or not.
  const skip = (delta: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    const time = Math.min(video.duration, Math.max(0, video.currentTime + delta));

    if (progressRef.current) {
      progressRef.current.style.width = `${(time / video.duration) * 100}%`;
    }
    if (timeRef.current) {
      timeRef.current.textContent = `${formatTime(time)} / ${formatTime(video.duration)}`;
    }

    if (engineRef.current) engineRef.current.seek(time);
    else video.currentTime = time;
  };

  const statusLabel: Record<string, string> = {
    WAITING: '',
    REQUESTING_CAMERA: 'Requesting camera access…',
    LOADING_MODEL: 'Loading hand tracking model…',
    READY: 'Show your hand to the camera',
    TRACKING: '',
    HAND_LOST: 'Hand lost — resuming playback',
    ERROR: errorMsg ?? 'Something went wrong',
  };

  return (
    <div
      ref={stageRef}
      className={`${styles.stage} ${isFullscreen ? styles.fullscreenActive : ''}`}
    >
      <div className={styles.camPanel}>
        <div className={styles.panelHead}>
          <span ref={trackDotRef} className={styles.trackDot} data-state="off" />
          <span className={styles.panelLabel}>HAND TRACKER</span>
          <div ref={debugRef} className={styles.debug} />
        </div>
        <div ref={camWrapRef} className={styles.camWrap}>
          <canvas ref={canvasRef} className={styles.overlay} />
        </div>
        <div className={styles.legend}>
          <span className={styles.lgForward}>forward</span>
          <span className={styles.lgFrozen}>frozen</span>
          <span className={styles.lgReverse}>reverse</span>
        </div>

        {/* the once-empty space below the tracker: a quiet control guide */}
        <div className={styles.tipsPanel}>
          <span className={styles.tipsLabel}>controls</span>

          <div className={styles.tipsGrid}>
            <div className={styles.tipCard}>
              <span className={styles.tipDot} style={{ background: 'var(--v-forward)' }} />
              <span className={styles.tipText}>pinch closed — 2× forward</span>
            </div>
            <div className={styles.tipCard}>
              <span className={styles.tipDot} style={{ background: 'var(--v-frozen)' }} />
              <span className={styles.tipText}>extend fingers — freeze</span>
            </div>
            <div className={styles.tipCard}>
              <span className={styles.tipDot} style={{ background: 'var(--v-reverse)' }} />
              <span className={styles.tipText}>extend further — rewind</span>
            </div>
            <div className={styles.tipCard}>
              <span className={styles.tipGlyph}>⤢</span>
              <span className={styles.tipText}>drag the timeline to scrub</span>
            </div>
          </div>

          <div className={styles.tipsDivider} />

          <div className={styles.keyGrid}>
            <div className={styles.keyCard}>
              <kbd className={styles.key}>space</kbd>
              <span className={styles.tipText}>play / pause</span>
            </div>
            <div className={styles.keyCard}>
              <span className={styles.keyPair}>
                <kbd className={styles.key}>←</kbd>
                <kbd className={styles.key}>→</kbd>
              </span>
              <span className={styles.tipText}>seek 5s</span>
            </div>
            <div className={styles.keyCard}>
              <span className={styles.keyPair}>
                <kbd className={styles.key}>↑</kbd>
                <kbd className={styles.key}>↓</kbd>
              </span>
              <span className={styles.tipText}>volume</span>
            </div>
            <div className={styles.keyCard}>
              <kbd className={styles.key}>m</kbd>
              <span className={styles.tipText}>mute</span>
            </div>
            <div className={styles.keyCard}>
              <kbd className={styles.key}>f</kbd>
              <span className={styles.tipText}>fullscreen</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.videoPanel}>
        <div className={styles.panelHead}>
          <span className={styles.panelLabel}>OUTPUT</span>
          <div ref={speedRef} className={styles.speed}>
            +1.00×
          </div>
        </div>
        <div className={styles.videoWrap}>
          <video
            ref={videoRef}
            src={videoUrl}
            className={styles.video}
            loop
            playsInline
            preload="auto"
            onClick={togglePlay}
          />

          <div className={styles.bottomBar}>
            <div
              ref={progressTrackRef}
              className={styles.progressTrack}
              onPointerDown={handleSeekPointerDown}
              onPointerMove={handleSeekPointerMove}
              onPointerUp={handleSeekPointerUp}
              onPointerCancel={handleSeekPointerUp}
            >
              <div ref={progressRef} className={styles.progressFill} />
            </div>

            <div className={styles.controlsRow}>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={() => skip(-15)}
                aria-label="Back 15 seconds"
                title="Back 15s"
              >
                <SkipBackIcon />
              </button>

              <button
                type="button"
                className={styles.playBtn}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={() => skip(15)}
                aria-label="Forward 15 seconds"
                title="Forward 15s"
              >
                <SkipForwardIcon />
              </button>

              <span ref={timeRef} className={styles.timeLabel}>
                0:00 / 0:00
              </span>

              <div className={styles.spacer} />

              <div className={styles.volumeGroup}>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  aria-label="Volume"
                />
              </div>

              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {engineState === 'WAITING' && (
        <div className={styles.startLayer}>
          <button className={styles.startButton} onClick={handleStart}>
            Enable camera &amp; start
          </button>
          <p className={styles.startHint}>
            Pinch closed = 2× forward · open your fingers = slow down, freeze,
            rewind
          </p>
        </div>
      )}

      {statusLabel[engineState] && engineState !== 'WAITING' && (
        <div className={styles.statusChip}>{statusLabel[engineState]}</div>
      )}

      <button className={styles.exitButton} onClick={onExit}>
        ✕ new video
      </button>
    </div>
  );
}
