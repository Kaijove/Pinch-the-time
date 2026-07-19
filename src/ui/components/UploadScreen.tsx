// Single-view landing inspired by classic Japan travel layouts:
// headline + visual dropzone on the left, night Japan illustration on
// the right, a compact lab strip at the bottom — everything visible
// without scrolling. Only the questions (and the hand explainer) live
// below the fold.

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Reveal } from './Reveal';
import { Magnetic } from './Magnetic';
import { HandSignalVisual } from './HandSignalVisual';
import styles from './UploadScreen.module.css';

interface Props {
  /** Resolves a file or URL; throws Error with a friendly message. */
  onInput: (input: string | File) => Promise<void>;
}

const EXPERIMENTS = [
  ['01', 'Timeline Manipulation'],
  ['02', 'Reverse Playback'],
  ['03', 'Slow Motion'],
  ['04', 'Signal Smoothing'],
  ['05', 'Gesture Calibration'],
  ['06', 'Live Tracking'],
];

const FAQ = [
  ['How does it see my hand?', 'A model runs locally in your browser — 21 points, no server.'],
  ['Is anything uploaded?', 'No. Camera, video and audio stay on your device.'],
  ['Which browsers?', 'Chromium-based browsers give the best performance.'],
  ['My own videos?', 'Drag in a file, or paste a direct video URL.'],
  ['A YouTube link?', 'You can watch it — gesture control needs a direct source.'],
  ['Two hands?', 'One, for now. The architecture allows for more.'],
];

export function UploadScreen({ onInput }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dzRef = useRef<HTMLDivElement>(null);

  // Scroll still drives the environment (rain, parallax).
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const max = page.scrollHeight - page.clientHeight;
      const p = max > 0 ? page.scrollTop / max : 0;
      document.documentElement.style.setProperty('--scroll', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    page.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      page.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Easter egg: double-click the hero -> the city wakes up.
  const toggleCity = () => document.body.classList.toggle('lit');

  // 3D tilt on the media card.
  const onDzMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = dzRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
    el.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };
  const onDzLeave = () => {
    const el = dzRef.current;
    if (el) el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  };

  const submitUrl = async (value: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onInput(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const pasteAndLoad = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      await submitUrl(text);
    } catch {
      setError('Clipboard access denied — paste manually.');
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('video/')) return;
      void onInput(file);
    },
    [onInput]
  );

  return (
    <div ref={pageRef} className={styles.page}>
      {/* ── EVERYTHING AT FIRST SIGHT ── */}
      <section id="top" className={styles.view} onDoubleClick={toggleCity}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>
            Time responds<br />to <span className={styles.gradientText}>movement.</span>
          </h1>
          <p className={styles.subline}>
            AI hand tracking turns your thumb–index distance into a
            continuous time controller. Pinch, hold, extend — the video follows.
          </p>
        </div>

        <div className={styles.heroRow}>
          <div className={styles.videoCol}>
            {/* the media card: a video frame waiting for its video */}
            <div
              ref={dzRef}
              role="button"
              tabIndex={0}
              aria-label="Upload a video"
              className={`${styles.mediaCard} ${dragOver ? styles.dragOver : ''}`}
              onPointerMove={onDzMove}
              onPointerLeave={(e) => {
                onDzLeave();
                void e;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span className={`${styles.corner} ${styles.cTL}`} />
              <span className={`${styles.corner} ${styles.cTR}`} />
              <span className={`${styles.corner} ${styles.cBL}`} />
              <span className={`${styles.corner} ${styles.cBR}`} />

              <div className={styles.mediaInner}>
                <svg className={styles.playGlyph} viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <circle cx="32" cy="32" r="30" stroke="url(#pg)" strokeWidth="1.6" opacity="0.6" />
                  <path d="M26 21 L46 32 L26 43 Z" fill="url(#pg)" />
                  <defs>
                    <linearGradient id="pg" x1="20" y1="20" x2="46" y2="44" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a8c8f0" />
                      <stop offset="1" stopColor="#8fd6e8" />
                    </linearGradient>
                  </defs>
                </svg>
                <p className={styles.mediaTitle}>Drop your video</p>
                <span className={styles.mediaSub}>or click to browse · stays on your device</span>
              </div>

              <div className={styles.urlBar} onClick={(e) => e.stopPropagation()}>
                <input
                  className={styles.urlInput}
                  type="url"
                  placeholder="…or a video / YouTube URL"
                  value={url}
                  disabled={busy}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitUrl(url);
                  }}
                />
                <button className={styles.urlPaste} disabled={busy} onClick={() => void pasteAndLoad()} title="Paste">
                  ⧉
                </button>
                <Magnetic strength={5}>
                  <button className={styles.urlLoad} disabled={busy || !url.trim()} onClick={() => void submitUrl(url)}>
                    {busy ? <span className={styles.spinner} /> : 'Load'}
                  </button>
                </Magnetic>
              </div>
              {error && <span className={styles.urlError}>{error}</span>}
            </div>
          </div>

          <div className={styles.handCol}>
            <div className={styles.handStage}>
              <HandSignalVisual />
              <p className={styles.handCaption}>Two fingers. One continuous signal.</p>
            </div>
          </div>
        </div>

        {/* compact lab strip + numbers, still inside the first view */}
        <div id="lab" className={styles.labStrip}>
          {EXPERIMENTS.map(([n, name]) => (
            <span key={name} className={styles.labItem}>
              <i>{n}</i>
              {name}
            </span>
          ))}
          <span className={styles.labNumbers}>60fps · 21 points · local only</span>
        </div>
      </section>

      {/* ── BELOW THE FOLD: the explainer + questions ── */}
      <section id="faq" className={styles.faq}>
        <Reveal><span className={styles.labLabel}>questions</span></Reveal>
        <div className={styles.faqList}>
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 30}>
              <div className={styles.faqItem}>
                <button
                  className={styles.faqQ}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {q}
                  <span className={`${styles.faqChevron} ${openFaq === i ? styles.faqChevronOpen : ''}`}>⌄</span>
                </button>
                <div className={`${styles.faqA} ${openFaq === i ? styles.faqAOpen : ''}`}>
                  <p>{a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

