// Wraps MediaPipe Hand Landmarker behind our own interface.
// If MediaPipe ever changes its API, this is the only file to touch.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandFrame } from '../events/EventBus';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type DetectResult =
  | { status: 'no-frame' } // camera has not produced a new frame yet
  | { status: 'no-hand' }  // new frame, but no hand in it
  | { status: 'hand'; frame: HandFrame };

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  }

  detect(video: HTMLVideoElement, nowMs: number): DetectResult {
    if (!this.landmarker || video.readyState < 2) return { status: 'no-frame' };

    // Camera runs at ~30fps, our loop at ~60fps.
    // Never run inference twice on the same camera frame.
    if (video.currentTime === this.lastVideoTime) return { status: 'no-frame' };
    this.lastVideoTime = video.currentTime;

    const result = this.landmarker.detectForVideo(video, nowMs);
    const hand = result.landmarks?.[0];
    if (!hand || hand.length < 21) return { status: 'no-hand' };

    return {
      status: 'hand',
      frame: {
        landmarks: hand.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        timestamp: nowMs,
      },
    };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
