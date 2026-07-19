// True reversed audio. HTML5 <video> cannot play sound backwards, so:
//  1. On load, fetch the video file and decode its audio track.
//  2. Build a second AudioBuffer with every sample reversed.
//  3. While scrubbing backwards, play the reversed buffer at |velocity|,
//     kept in sync with the video position (resync on drift/wrap).
// Classic "tape rewind" effect, done properly.

import {
  REVERSE_AUDIO_MIN_V,
  REVERSE_AUDIO_RESYNC_S,
} from '../../config/interaction';

export class ReverseAudioPlayer {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null; // reversed samples
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;

  // Bookkeeping to estimate the current position of the playing source
  private startCtxTime = 0;
  private startOffset = 0;
  private currentRate = 1;
  private ready = false;
  // User-controlled ceiling for reverse-playback audio (mouse volume slider).
  private userVolume = 1;

  /** Manual volume from the UI (mouse volume slider), 0..1. */
  setVolume(v: number): void {
    this.userVolume = Math.min(1, Math.max(0, v));
  }

  async load(url: string): Promise<void> {
    try {
      // Created inside the user-gesture call chain so autoplay policy is happy
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.ctx.destination);

      const res = await fetch(url);
      const decoded = await this.ctx.decodeAudioData(await res.arrayBuffer());

      const rev = this.ctx.createBuffer(
        decoded.numberOfChannels,
        decoded.length,
        decoded.sampleRate
      );
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const src = decoded.getChannelData(ch);
        const dst = rev.getChannelData(ch);
        for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i];
      }

      this.buffer = rev;
      this.ready = true;
      console.log('[ReverseAudio] ready');
    } catch (err) {
      // Video without audio track, unsupported codec... just skip silently
      console.warn('[ReverseAudio] disabled:', err);
    }
  }

  /** Estimated playhead inside the reversed buffer right now. */
  private expectedPos(): number {
    if (!this.ctx || !this.source) return -1;
    return (
      this.startOffset +
      (this.ctx.currentTime - this.startCtxTime) * this.currentRate
    );
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source = null;
    }
  }

  /**
   * Called every tick.
   * @param velocity current playback velocity (negative = reverse)
   * @param virtualTime current video time in seconds
   */
  update(velocity: number, virtualTime: number): void {
    if (!this.ready || !this.ctx || !this.buffer || !this.gain) return;

    const active = velocity < -REVERSE_AUDIO_MIN_V;

    if (!active) {
      this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      this.stopSource();
      return;
    }

    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const dur = this.buffer.duration;
    const rate = Math.min(16, Math.max(0.0625, -velocity));
    // Position in the REVERSED buffer that matches the video position
    const target = dur - Math.min(Math.max(virtualTime, 0), dur);

    const drifted =
      !this.source ||
      Math.abs(this.expectedPos() - target) > REVERSE_AUDIO_RESYNC_S;

    if (drifted) {
      this.stopSource();
      const s = this.ctx.createBufferSource();
      s.buffer = this.buffer;
      s.playbackRate.value = rate;
      s.connect(this.gain);
      const offset = Math.min(Math.max(target, 0), dur - 0.01);
      s.start(0, offset);
      this.source = s;
      this.startCtxTime = this.ctx.currentTime;
      this.startOffset = offset;
      this.currentRate = rate;
    } else if (this.source && Math.abs(this.currentRate - rate) > 0.01) {
      // Update bookkeeping BEFORE changing the rate
      this.startOffset = this.expectedPos();
      this.startCtxTime = this.ctx.currentTime;
      this.source.playbackRate.value = rate;
      this.currentRate = rate;
    }

    this.gain.gain.setTargetAtTime(0.9 * this.userVolume, this.ctx.currentTime, 0.04);
  }

  dispose(): void {
    this.stopSource();
    void this.ctx?.close();
    this.ctx = null;
    this.buffer = null;
    this.gain = null;
    this.ready = false;
  }
}
