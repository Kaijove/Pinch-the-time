// Maps the pinch value [0,1] to a playback velocity through a curve of
// control points (linear interpolation between them). No if/else states,
// no thresholds: a pure continuous function. Strategy pattern — swap the
// curve in config to change the whole feel of the interaction.

export interface CurvePoint {
  pinch: number;
  velocity: number;
}

export class VelocityMapper {
  private points: CurvePoint[];

  constructor(points: CurvePoint[]) {
    this.points = [...points].sort((a, b) => a.pinch - b.pinch);
  }

  map(pinch: number): number {
    const pts = this.points;
    if (pinch <= pts[0].pinch) return pts[0].velocity;
    if (pinch >= pts[pts.length - 1].pinch) return pts[pts.length - 1].velocity;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (pinch >= a.pinch && pinch <= b.pinch) {
        const t = (pinch - a.pinch) / (b.pinch - a.pinch);
        // smoothstep easing inside each segment for softer transitions
        const s = t * t * (3 - 2 * t);
        return a.velocity + (b.velocity - a.velocity) * s;
      }
    }
    return pts[pts.length - 1].velocity;
  }
}
