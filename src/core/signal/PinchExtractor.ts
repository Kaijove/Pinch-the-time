// Turns 21 landmarks into a single depth-invariant pinch value [0,1].
// Key idea: divide the thumb-index distance by a reference distance of
// the hand itself (wrist -> middle finger base), so moving the hand
// closer/further from the camera does not change the signal.

import { PINCH_CONFIG } from '../../config/interaction';

interface Point {
  x: number;
  y: number;
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export class PinchExtractor {
  private last = 0;

  /** landmarks: the 21 normalized hand landmarks from MediaPipe */
  extract(landmarks: Point[]): number {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const middleBase = landmarks[9];

    const ref = dist(wrist, middleBase);
    if (ref < 1e-6) return this.last; // degenerate frame, keep last value

    const ratio = dist(thumbTip, indexTip) / ref;
    const t =
      (ratio - PINCH_CONFIG.closedRatio) /
      (PINCH_CONFIG.openRatio - PINCH_CONFIG.closedRatio);

    this.last = Math.min(1, Math.max(0, t));
    return this.last;
  }
}
