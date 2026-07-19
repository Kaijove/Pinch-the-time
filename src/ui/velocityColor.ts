// The brand's semantic color: every velocity has a hue.
//   forward  -> teal/cyan   (time flows)
//   frozen   -> amber       (time held)
//   reverse  -> magenta     (time bent backwards)
// Used by the hand overlay, the HUD and the progress bar so the whole
// interface breathes with the interaction.

export function velocityHue(velocity: number): number {
  const v = Math.max(-2, Math.min(2, velocity));
  if (v >= 0) {
    // warm silver (45) -> ice cyan (192)
    return 45 + (192 - 45) * (v / 2);
  }
  // warm silver (45) -> soft lavender (265): 45 -> -95 ≡ 265
  return 45 + (v / 2) * 70;
}

export function velocityColor(velocity: number, alpha = 1): string {
  // desaturated + light: calm, never flashy
  return `hsla(${velocityHue(velocity)}, 48%, 74%, ${alpha})`;
}
