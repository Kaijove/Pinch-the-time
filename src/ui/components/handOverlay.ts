// Custom hand visualization — part of the branding.
// Thin elegant bones, glowing joints, and the signature "time thread":
// a gradient line between thumb and index whose color follows the
// current velocity (teal = forward, amber = frozen, magenta = reverse).

import type { HandFrame } from '../../core/events/EventBus';
import { velocityColor } from '../velocityColor';

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  frame: HandFrame | null,
  velocity: number
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!frame) return;

  const px = (i: number) => (1 - frame.landmarks[i].x) * width; // mirror X
  const py = (i: number) => frame.landmarks[i].y * height;

  // ── Skeleton: thin, quiet, almost architectural ──
  ctx.strokeStyle = 'rgba(242, 244, 248, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a, b] of CONNECTIONS) {
    ctx.moveTo(px(a), py(a));
    ctx.lineTo(px(b), py(b));
  }
  ctx.stroke();

  // Joints: tiny soft dots
  ctx.fillStyle = 'rgba(242, 244, 248, 0.45)';
  for (let i = 0; i < 21; i++) {
    if (i === 4 || i === 8) continue; // the stars get drawn below
    ctx.beginPath();
    ctx.arc(px(i), py(i), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── The time thread: thumb tip <-> index tip ──
  const x1 = px(4), y1 = py(4);
  const x2 = px(8), y2 = py(8);
  const color = velocityColor(velocity);
  const glow = velocityColor(velocity, 0.45);

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, 'rgba(168, 200, 240, 0.9)');
  grad.addColorStop(1, color);

  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Glowing fingertip nodes
  for (const [x, y, c] of [
    [x1, y1, 'rgba(168, 200, 240, 0.95)'],
    [x2, y2, color],
  ] as [number, number, string][]) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = c;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
