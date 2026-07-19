// Video source abstraction. The gesture engine never knows where a video
// comes from — it only receives a playable URL for the <video> element.
//
//   VideoSource
//   ├── local   — user file (object URL)            -> full gesture control
//   ├── url     — direct MP4/WebM/MOV link           -> full gesture control
//   └── youtube — official embed only (see below)    -> not engine-playable
//
// WHY YOUTUBE CAN'T FEED THE ENGINE: YouTube does not expose direct media
// URLs (they are hidden, signed and rotated), extracting them violates its
// Terms of Service, and CORS would block Web Audio anyway. The technically
// correct behavior is: validate, fetch real metadata via the official
// oEmbed API, and play through the official embedded player — while
// pointing the user to direct sources for gesture control.
// Adding future providers (Vimeo, cloud storage…) = one more branch here.

export type SourceKind = 'local' | 'url' | 'youtube';

export interface VideoSourceInfo {
  kind: SourceKind;
  playable: boolean;      // can our engine drive it?
  url: string | null;     // URL for the <video> element (if playable)
  title: string;
  thumbnail?: string;
  youtubeId?: string;
  note?: string;          // why it is not playable, if applicable
}

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
];

const DIRECT_VIDEO = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export function extractYouTubeId(input: string): string | null {
  for (const re of YT_PATTERNS) {
    const m = input.match(re);
    if (m) return m[1];
  }
  return null;
}

export async function resolveSource(input: string | File): Promise<VideoSourceInfo> {
  // ── Local file ──
  if (input instanceof File) {
    return {
      kind: 'local',
      playable: true,
      url: URL.createObjectURL(input),
      title: input.name,
    };
  }

  const raw = input.trim();
  if (!raw) throw new Error('Please paste a video URL first.');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('That doesn\u2019t look like a valid URL.');
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('Only http(s) URLs are supported.');
  }

  // ── YouTube ──
  const ytId = extractYouTubeId(raw);
  if (ytId) {
    let title = 'YouTube video';
    let thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${ytId}`
        )}&format=json`
      );
      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? 'This video is private or embedding is disabled.'
            : 'This video is unavailable (removed, private or region-locked).'
        );
      }
      const meta = (await res.json()) as { title?: string; thumbnail_url?: string };
      if (meta.title) title = meta.title;
      if (meta.thumbnail_url) thumbnail = meta.thumbnail_url;
    } catch (err) {
      if (err instanceof Error && /private|unavailable/.test(err.message)) throw err;
      // network hiccup: continue with defaults rather than crashing
    }
    return {
      kind: 'youtube',
      playable: false,
      url: null,
      title,
      thumbnail,
      youtubeId: ytId,
      note:
        'YouTube doesn\u2019t expose direct media streams, so gesture control isn\u2019t possible for this source. You can watch it here through the official player \u2014 for full pinch control, use a local file or a direct video URL.',
    };
  }

  // ── Direct video URL ──
  if (DIRECT_VIDEO.test(parsed.pathname)) {
    const name = decodeURIComponent(parsed.pathname.split('/').pop() ?? 'Remote video');
    return { kind: 'url', playable: true, url: raw, title: name };
  }

  throw new Error(
    'Unsupported source. Paste a YouTube link or a direct video URL (.mp4, .webm\u2026).'
  );
}
