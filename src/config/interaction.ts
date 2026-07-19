// All the "feel" of the interaction lives here. Tuning = touching only this file.

export const PINCH_CONFIG = {
  // Ratio dist(4,8)/dist(0,9) considered fully closed / fully open pinch.
  // Lower openRatio = you reach "fully open" earlier = more sensitivity.
  closedRatio: 0.15,
  openRatio: 0.85,
};

// Control points of the pinch -> velocity curve (lerp between points).
// Three zones matching natural hand poses:
//   pinched      -> 2x forward
//   natural rest -> 1x (FLAT plateau: small finger wobble changes nothing)
//   extended     -> slows, freezes, then reverse up to -2x
export const VELOCITY_CURVE: { pinch: number; velocity: number }[] = [
  { pinch: 0.0, velocity: 2.0 },   // fully pinched -> 2x forward
  { pinch: 0.22, velocity: 1.0 },  // entering the natural zone
  { pinch: 0.5, velocity: 1.0 },   // natural rest plateau -> normal playback
  { pinch: 0.68, velocity: 0.0 },  // extending -> frozen
  { pinch: 0.84, velocity: -1.0 }, // more extended -> reverse
  { pinch: 1.0, velocity: -2.0 },  // fully extended -> 2x reverse
];

// Forward native playback (real <video> playback with audio, variable rate).
// Hysteresis: enter above ENTER, leave below EXIT — prevents mode
// flip-flopping (audio stutter) when velocity hovers near the threshold.
export const FORWARD_NATIVE_ENTER = 0.18;
export const FORWARD_NATIVE_EXIT = 0.1;

// Audio fade time when playback resumes (seconds)
export const AUDIO_FADE_S = 0.15;

// Reverse audio: minimum reverse speed before the reversed audio kicks in
export const REVERSE_AUDIO_MIN_V = 0.18;
// Resync the reversed audio if it drifts more than this from the video (s)
export const REVERSE_AUDIO_RESYNC_S = 0.15;

// Signal decay when the hand is lost (seconds until back to 0)
export const HAND_LOST_DECAY_S = 0.5;

export const ONE_EURO = {
  minCutoff: 0.4, // lower = smoother at rest
  beta: 0.05,     // higher = more responsive on fast movement
};

// Extra smoothing applied to the velocity itself (seconds).
// Higher = more fluid speed changes, lower = more immediate.
export const VELOCITY_SMOOTH_TAU = 0.2;
