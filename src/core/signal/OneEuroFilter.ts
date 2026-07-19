// One Euro Filter (Casiez et al. 2012) — the standard HCI filter for
// noisy input signals. Adaptive: smooths a lot when the signal is slow
// (kills jitter), smooths little when it moves fast (low latency).

export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;

  constructor(
    private minCutoff: number,
    private beta: number,
    private dCutoff = 1.0
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, dt: number): number {
    if (this.xPrev === null || dt <= 0) {
      this.xPrev = x;
      return x;
    }

    // Estimate signal speed (filtered derivative)
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    // Cutoff grows with speed -> less smoothing when moving fast
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }

  /** Force the internal state to a value (used after hand-lost decay). */
  setValue(v: number): void {
    this.xPrev = v;
    this.dxPrev = 0;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
  }
}
