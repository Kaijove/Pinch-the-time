import { useAppState } from './ui/hooks/useAppState';
import { UploadScreen } from './ui/components/UploadScreen';
import { PlayerScreen } from './ui/components/PlayerScreen';
import { Scene } from './ui/components/Scene';
import { resolveSource } from './core/sources/VideoSource';
import styles from './App.module.css';

const APP_VERSION = '5.12.0';

export default function App() {
  const { data, setSource, setState } = useAppState();

  const handleExit = () => {
    if (data.videoUrl?.startsWith('blob:')) URL.revokeObjectURL(data.videoUrl);
    setState('UPLOAD');
  };

  /** Shared by the dropzone and the URL bar. Throws with a friendly message. */
  const handleInput = async (input: string | File) => {
    const info = await resolveSource(input);
    setSource(info);
  };

  const src = data.source;

  return (
    <div className={styles.window}>
      <Scene />
      <header className={styles.titleBar}>
        <svg className={styles.logo} viewBox="0 0 32 32" aria-hidden="true">
          <line x1="9" y1="22" x2="23" y2="10" stroke="url(#lg)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="9" cy="22" r="4" fill="#a8c8f0" />
          <circle cx="23" cy="10" r="4" fill="#8fd6e8" />
          <defs>
            <linearGradient id="lg" x1="9" y1="22" x2="23" y2="10" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a8c8f0" />
              <stop offset="1" stopColor="#8fd6e8" />
            </linearGradient>
          </defs>
        </svg>
        <span className={styles.title}>PINCH·TIME</span>
        {data.state === 'UPLOAD' ? (
          <nav className={styles.nav}>
            <a href="#top">home</a>
            <a href="#lab">lab</a>
            <a href="#faq">questions</a>
          </nav>
        ) : (
          <span className={styles.status}>{data.videoName}</span>
        )}
      </header>

      {data.state === 'UPLOAD' && <UploadScreen onInput={handleInput} />}

      {data.state === 'YOUTUBE' && src?.youtubeId && (
        <div className={styles.ytView}>
          <div className={styles.ytCard}>
            <div className={styles.ytHead}>
              <span className={styles.ytBadge}>YOUTUBE</span>
              <h2 className={styles.ytTitle}>{src.title}</h2>
            </div>
            <div className={styles.ytPlayer}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${src.youtubeId}`}
                title={src.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className={styles.ytNote}>{src.note}</p>
            <button className={styles.ytBack} onClick={handleExit}>
              ‹ choose another source
            </button>
          </div>
        </div>
      )}

      {data.state !== 'UPLOAD' && data.state !== 'YOUTUBE' && data.videoUrl && (
        <PlayerScreen videoUrl={data.videoUrl} onExit={handleExit} />
      )}

      <footer className={styles.footer}>
        <span className={styles.footerSignature}>
          Designed &amp; Engineered by <strong>Kai Jové</strong>
        </span>
        <span className={styles.footerDot}>·</span>
        <span className={styles.footerClosing}>
          An exploration in human&ndash;computer interaction
        </span>
        <span className={styles.footerDot}>·</span>
        <span className={styles.footerMeta}>v{APP_VERSION} · Built with React + MediaPipe</span>
        <span className={styles.footerDot}>·</span>
        <a className={styles.footerLink} href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </div>
  );
}
