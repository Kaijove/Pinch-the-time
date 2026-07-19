// Magnetic hover: the element leans gently toward the cursor within a
// small radius, and springs back on leave. Direct style writes, no state.

import { useRef, type ReactNode, type PointerEvent } from 'react';

interface Props {
  children: ReactNode;
  strength?: number; // max px of attraction
}

export function Magnetic({ children, strength = 7 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${(dx / r.width) * strength * 2}px, ${(dy / r.height) * strength * 2}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0, 0)';
  };

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ display: 'inline-block', transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {children}
    </span>
  );
}
