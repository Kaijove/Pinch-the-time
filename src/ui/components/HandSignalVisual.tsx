// Visual storytelling instead of a sentence: a resting hand, its two
// tracked fingertips glowing, feeding a signal line below.
// Interactive: move your cursor over it and the index fingertip leans
// toward you, the thread stretches, and the wave amplitude follows —
// the page teaches "distance becomes signal" by letting you feel it.

import { useRef, type PointerEvent } from 'react';
import styles from './HandSignalVisual.module.css';

export function HandSignalVisual() {
  const tipRef = useRef<SVGGElement>(null);
  const threadRef = useRef<SVGLineElement>(null);
  const waveRef = useRef<SVGPathElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    // Cursor position relative to the visual, in SVG-ish units
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1..1
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    const dx = nx * 16;
    const dy = ny * 12;

    if (tipRef.current) {
      tipRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    if (threadRef.current) {
      threadRef.current.setAttribute('x2', String(110 + dx));
      threadRef.current.setAttribute('y2', String(42 + dy));
    }
    if (waveRef.current) {
      // stretch of the thread modulates the wave amplitude
      const stretch = Math.min(1, Math.hypot(dx, dy) / 20);
      waveRef.current.style.transform = `scaleY(${(0.5 + stretch * 1.3).toFixed(2)})`;
    }
  };

  const onLeave = () => {
    if (tipRef.current) tipRef.current.style.transform = 'translate(0px, 0px)';
    if (threadRef.current) {
      threadRef.current.setAttribute('x2', '110');
      threadRef.current.setAttribute('y2', '42');
    }
    if (waveRef.current) waveRef.current.style.transform = 'scaleY(1)';
  };

  return (
    <div ref={wrapRef} className={styles.wrap} onPointerMove={onMove} onPointerLeave={onLeave}>
      <svg viewBox="0 0 220 200" className={styles.hand} aria-hidden="true">
        <g stroke="rgba(242,244,248,0.3)" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M70 170 L66 100 M66 100 L58 60 M70 170 L88 96 M88 96 L86 48 M70 170 L108 92 M108 92 L110 42 M70 170 L126 100 M126 100 L132 56 M70 170 L142 118 M142 118 L152 88" />
          <path d="M70 170 Q100 190 140 170" opacity="0.5" />
        </g>
        <g fill="rgba(242,244,248,0.35)">
          <circle cx="88" cy="96" r="2.4" />
          <circle cx="86" cy="48" r="2.4" />
          <circle cx="108" cy="92" r="2.4" />
          <circle cx="126" cy="100" r="2.4" />
          <circle cx="132" cy="56" r="2.4" />
          <circle cx="142" cy="118" r="2.4" />
          <circle cx="152" cy="88" r="2.4" />
        </g>
        <line ref={threadRef} x1="58" y1="60" x2="110" y2="42" className={styles.thread} />
        <circle cx="58" cy="60" r="4.5" className={styles.nodeA} />
        <g ref={tipRef} className={styles.tipGroup}>
          <circle cx="110" cy="42" r="4.5" className={styles.nodeB} />
        </g>
      </svg>

      <svg viewBox="0 0 260 48" className={styles.wave} preserveAspectRatio="none" aria-hidden="true">
        <path
          ref={waveRef}
          d="M0 24 Q 16 4, 32 24 T 64 24 T 96 24 T 128 24 T 160 24 T 192 24 T 224 24 T 256 24"
          className={styles.waveline}
        />
      </svg>
    </div>
  );
}
