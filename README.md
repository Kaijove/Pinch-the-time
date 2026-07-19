# PINCH·TIME

Control video playback with your hand. The distance between your thumb and
index finger becomes a continuous time controller: fingers together = normal
playback, opening them slows the video down, freezes it, and finally plays
it in reverse.

On top of that, the output video also has classic mouse controls, like any
video player:
- **Seek** — click or drag anywhere on the progress bar.
- **Volume** — slider + mute button, works together with the gesture-driven
  audio (reverse tape rewind, forward fade-in).
- **Fullscreen** — the fullscreen button expands just the video panel to
  fill the whole screen and hides the camera panel; leaving fullscreen
  (button or Esc) restores the normal split view.

Built with React + Vite + TypeScript + MediaPipe Hand Landmarker.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Status

- [x] Phase 1 — Project setup (EventBus, RafLoop, config)
- [x] Phase 2 — Upload screen + app window UI + CameraService
- [x] Phase 3 — MediaPipe hand tracking + landmark overlay
- [x] Phase 4 — Pinch signal + One Euro filter
- [x] Phase 5 — Velocity mapping
- [x] Phase 6 — Scrub engine (reverse playback)
- [x] Phase 7 — Interaction polish (One Euro + velocity smoothing + hysteresis)
- [x] Phase 8 — Reverse audio engine (Web Audio, reversed buffer)
- [x] Phase 9 — UI design (velocity color system, HUD, hero landing)
- [x] Phase 10 — Final landing page (How it works, gesture map, tech stack)

## Deploy

Push to GitHub, import the repo in [Vercel](https://vercel.com) and deploy — no config needed (Vite is auto-detected). Add screenshots/GIFs of the interaction here for the portfolio.

## Alive experience

The page now responds to the visitor: scroll drives parallax depth layers, rain intensity and the hero dissolve; buttons are magnetic; the dropzone tilts in 3D under the cursor; the hero hand visual stretches its signal thread toward your pointer; dust particles and an aurora keep the room breathing; and double-clicking the opening wakes up the city lights (easter egg).

## Minimal, cinematic redesign

The landing now opens almost empty — one line, one scroll cue — then unfolds: a visual hand+signal explainer, the live demo as a discovered moment, an "experiments lab" instead of a feature list, a quiet signal-to-screen diagram, and a one-line before/after. Copy is intentionally sparse throughout.

## Full product landing (superseded)

The homepage is a complete scroll story: hero with live demo, philosophy statement, interaction timeline, how-it-works pipeline, features grid, tech stack, architecture diagram, traditional-vs-gesture comparison, animated performance stats, and an FAQ accordion — all with scroll-reveal animations.

## Spacebar pause

Pressing Space toggles play/pause through the engine itself (not the raw video element), so a manual pause freezes playback and overrides the gesture signal until you resume — no fighting between mouse and hand control.

## Mouse controls

Hover the video for a YouTube-style bar: play/pause, click-or-drag seek, volume, and a fullscreen toggle that hides the camera panel and expands the video to fill the screen (uses the browser Fullscreen API). Gesture control keeps working underneath — the mouse just gives you a manual override.

## Tuning

Everything about the feel lives in `src/config/interaction.ts`: the pinch calibration, the velocity curve (including the natural-rest plateau), smoothing amounts and audio thresholds.
