// The one and only requestAnimationFrame of the app.
// Runs registered callbacks every frame with the real deltaTime.

export type TickCallback = (deltaTime: number, now: number) => void;

export class RafLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private callbacks: TickCallback[] = [];

  add(cb: TickCallback): void {
    this.callbacks.push(cb);
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      // Clamp dt: if the tab loses focus we avoid giant jumps
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      for (const cb of this.callbacks) {
        try {
          cb(dt, now);
        } catch (err) {
          // One failing callback must NEVER kill the whole loop
          console.error('[RafLoop] tick error:', err);
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
