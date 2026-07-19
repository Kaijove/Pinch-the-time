// The video motor. Two modes, switched automatically WITH HYSTERESIS:
//
//  FORWARD — any clearly-forward velocity plays natively with audio,
//            using playbackRate = velocity (browsers pitch-correct it,
//            so 2x sounds fast but not chipmunk-y).
//  SCRUB   — freeze and reverse: video stays paused and we drive
//            currentTime ourselves: virtualTime += velocity * dt.
//            (Reverse audio is handled separately by ReverseAudioPlayer.)
//
// Hysteresis: enter forward mode above ENTER, leave below EXIT. Without
// the gap, a velocity hovering near the threshold flips modes every few
// frames and the audio stutters.

import {
  FORWARD_NATIVE_ENTER,
  FORWARD_NATIVE_EXIT,
  AUDIO_FADE_S,
} from '../../config/interaction';

export type PlaybackMode = 'forward' | 'scrub';

export class ScrubEngine {
  private virtualTime = 0;
  private mode: PlaybackMode = 'scrub';
  // User-controlled ceiling for forward-mode audio (mouse volume slider).
  private userVolume = 1;
  // Manual pause from the UI/spacebar. Freezes playback regardless of
  // the gesture's velocity until explicitly resumed.
  private userPaused = false;

  constructor(private video: HTMLVideoElement) {}

  /** Manual seek from the UI (progress-bar click/drag). Works in either mode. */
  seekTo(time: number): void {
    const duration = this.video.duration;
    if (!isFinite(duration) || duration <= 0) return;
    const t = Math.min(Math.max(time, 0), duration);
    this.virtualTime = t;
    if (!this.video.seeking) {
      this.video.currentTime = t;
    }
  }

  /** Manual volume from the UI (mouse volume slider), 0..1. */
  setVolume(v: number): void {
    this.userVolume = Math.min(1, Math.max(0, v));
  }

  /** Manual pause/resume, e.g. spacebar or the play button. Overrides
   *  the gesture signal until resumed. */
  setPaused(p: boolean): void {
    this.userPaused = p;
    if (p) {
      this.mode = 'scrub';
      this.virtualTime = this.video.currentTime;
      this.video.pause();
      this.video.volume = 0;
    }
  }

  isPaused(): boolean {
    return this.userPaused;
  }

  update(velocity: number, dt: number): void {
    const duration = this.video.duration;
    if (!isFinite(duration) || duration <= 0) return;
    if (this.userPaused) return; // frozen until resumed

    const wantForward =
      this.mode === 'forward'
        ? velocity > FORWARD_NATIVE_EXIT // already forward: stay unless slow
        : velocity > FORWARD_NATIVE_ENTER; // in scrub: enter when clearly fwd

    if (wantForward) {
      if (this.mode !== 'forward') {
        this.mode = 'forward';
        this.video.volume = 0; // start silent, fade in below
        this.video.play().catch(() => {
          // Browser blocked audible autoplay. Fall back to muted playback
          // so the motion keeps working; the UI unmutes on the next click.
          this.video.muted = true;
          void this.video.play();
        });
      }
      // Variable-rate native playback: the audio follows, pitch-corrected
      this.video.playbackRate = Math.min(16, Math.max(0.0625, velocity));
      // Fade audio towards the user's chosen volume — no harsh click, and
      // reacts smoothly if the volume slider moves up or down mid-fade.
      const diff = this.userVolume - this.video.volume;
      const step = dt / AUDIO_FADE_S;
      this.video.volume =
        Math.abs(diff) <= step ? this.userVolume : this.video.volume + Math.sign(diff) * step;
      // Native playback owns the clock; we just follow it.
      this.virtualTime = this.video.currentTime;
      return;
    }

    if (this.mode !== 'scrub') {
      this.mode = 'scrub';
      this.virtualTime = this.video.currentTime;
      this.video.volume = 0;
      this.video.pause();
    }

    this.virtualTime += velocity * dt;

    // Loop in both directions
    if (this.virtualTime < 0) this.virtualTime += duration;
    if (this.virtualTime >= duration) this.virtualTime -= duration;

    // fastSeek is built for exactly this — frequent, approximate seeks
    // during scrubbing — and doesn't stall behind a pending precise seek
    // the way repeatedly setting currentTime can. That stall was the
    // main source of visible lag on reverse. Fall back to currentTime
    // where fastSeek isn't available, but only when not already seeking.
    const fastSeek = (
      this.video as HTMLVideoElement & { fastSeek?: (t: number) => void }
    ).fastSeek?.bind(this.video);
    if (fastSeek) {
      fastSeek(this.virtualTime);
    } else if (!this.video.seeking) {
      this.video.currentTime = this.virtualTime;
    }
  }

  getMode(): PlaybackMode {
    return this.mode;
  }

  getTime(): number {
    return this.virtualTime;
  }
}
