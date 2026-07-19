// Facade of the whole core. The UI only ever talks to this class:
// start(), stop() and event subscriptions through the bus.
//
// Per-frame pipeline:
//   camera frame -> HandTracker -> PinchExtractor -> OneEuroFilter
//   -> VelocityMapper -> ScrubEngine -> events for the UI overlay

import { EventBus } from '../events/EventBus';
import { RafLoop } from '../loop/RafLoop';
import { CameraService } from '../camera/CameraService';
import { HandTracker } from '../tracking/HandTracker';
import { PinchExtractor } from '../signal/PinchExtractor';
import { OneEuroFilter } from '../signal/OneEuroFilter';
import { VelocityMapper } from '../interaction/VelocityMapper';
import { ScrubEngine } from '../video/ScrubEngine';
import { ReverseAudioPlayer } from '../audio/ReverseAudioPlayer';
import {
  VELOCITY_CURVE,
  ONE_EURO,
  HAND_LOST_DECAY_S,
  VELOCITY_SMOOTH_TAU,
} from '../../config/interaction';

export class Engine {
  readonly bus = new EventBus();

  private loop = new RafLoop();
  private camera = new CameraService();
  private tracker = new HandTracker();
  private extractor = new PinchExtractor();
  private filter = new OneEuroFilter(ONE_EURO.minCutoff, ONE_EURO.beta);
  private mapper = new VelocityMapper(VELOCITY_CURVE);
  private scrub: ScrubEngine;
  private reverseAudio = new ReverseAudioPlayer();

  private pinch = 0; // current smooth pinch [0,1]
  private rawPinch = 0;
  private velocity = 1; // smoothed velocity actually applied to the video
  private tracking = false;
  private smoothFps = 60;
  private debugAccum = 0;
  private started = false;

  constructor(private userVideo: HTMLVideoElement) {
    this.scrub = new ScrubEngine(userVideo);
  }

  /** The webcam <video> element, so the UI can display the live feed. */
  get cameraElement(): HTMLVideoElement {
    return this.camera.videoElement;
  }

  /** Manual seek from mouse/UI (progress-bar click or drag), in seconds. */
  seek(time: number): void {
    this.scrub.seekTo(time);
  }

  /** Manual volume from mouse/UI (volume slider), 0..1. Applies to both
   *  forward native playback and the reversed-audio engine. */
  setVolume(v: number): void {
    this.scrub.setVolume(v);
    this.reverseAudio.setVolume(v);
  }

  /** Manual pause/resume — spacebar or the play button. Freezes playback
   *  regardless of the current gesture until resumed. */
  setPaused(p: boolean): void {
    this.scrub.setPaused(p);
  }

  togglePause(): boolean {
    const next = !this.scrub.isPaused();
    this.scrub.setPaused(next);
    return next;
  }

  isPaused(): boolean {
    return this.scrub.isPaused();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      // Kick off the reversed-audio decode in the background, and create
      // its AudioContext NOW, inside the user-gesture call chain.
      void this.reverseAudio.load(this.userVideo.currentSrc);

      this.bus.emit('stateChange', 'REQUESTING_CAMERA');
      await this.camera.start();
      console.log('[Engine] camera ok');

      this.bus.emit('stateChange', 'LOADING_MODEL');
      await this.tracker.init();
      console.log('[Engine] model ok');

      this.bus.emit('stateChange', 'READY');
      // Kick playback once from the user gesture chain (audio policy).
      // If audible autoplay is blocked, start muted so motion still works.
      this.userVideo.play().catch(() => {
        this.userVideo.muted = true;
        void this.userVideo.play();
      });

      this.loop.add(this.tick);
      this.loop.start();
      console.log('[Engine] loop started');
    } catch (err) {
      console.error('[Engine] start failed:', err);
      this.bus.emit(
        'error',
        err instanceof Error ? err.message : 'Unknown error starting engine'
      );
      this.bus.emit('stateChange', 'ERROR');
    }
  }

  private tick = (dt: number, now: number): void => {
    this.smoothFps = this.smoothFps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;

    const result = this.tracker.detect(this.camera.videoElement, now);

    if (result.status === 'hand') {
      this.rawPinch = this.extractor.extract(result.frame.landmarks);
      this.pinch = this.filter.filter(this.rawPinch, dt);
      if (!this.tracking) {
        this.tracking = true;
        this.bus.emit('stateChange', 'TRACKING');
      }
      this.bus.emit('handFrame', result.frame);
    } else if (result.status === 'no-hand') {
      // Decay the signal smoothly towards 0 (= normal playback)
      this.pinch = Math.max(0, this.pinch - dt / HAND_LOST_DECAY_S);
      this.filter.setValue(this.pinch);
      if (this.tracking) {
        this.tracking = false;
        this.bus.emit('stateChange', 'HAND_LOST');
      }
      this.bus.emit('handFrame', null);
    }
    // status 'no-frame': keep last pinch, the scrub keeps integrating below

    // Target velocity from the curve, then smoothed exponentially so
    // speed changes feel fluid instead of stepped.
    const target = this.mapper.map(this.pinch);
    const k = 1 - Math.exp(-dt / VELOCITY_SMOOTH_TAU);
    this.velocity += (target - this.velocity) * k;
    this.scrub.update(this.velocity, dt);
    this.reverseAudio.update(this.scrub.isPaused() ? 0 : this.velocity, this.scrub.getTime());

    // Debug readout at ~8Hz, not every frame
    this.debugAccum += dt;
    if (this.debugAccum > 0.125) {
      this.debugAccum = 0;
      this.bus.emit('debugData', {
        rawPinch: this.rawPinch,
        smoothPinch: this.pinch,
        velocity: this.velocity,
        fps: this.smoothFps,
        time: this.scrub.getTime(),
        duration: this.userVideo.duration || 0,
      });
    }
  };

  stop(): void {
    this.loop.stop();
    this.camera.stop();
    this.tracker.close();
    this.reverseAudio.dispose();
    this.userVideo.pause();
    this.bus.clear();
    this.started = false;
  }
}
