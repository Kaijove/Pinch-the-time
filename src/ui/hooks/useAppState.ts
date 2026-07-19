// App-level state machine. React re-renders ONLY when this changes.

import { useState, useCallback } from 'react';
import type { AppState } from '../../core/events/EventBus';
import type { VideoSourceInfo } from '../../core/sources/VideoSource';

export interface AppStateData {
  state: AppState | 'UPLOAD' | 'YOUTUBE';
  videoUrl: string | null;
  videoName: string | null;
  source: VideoSourceInfo | null;
  error: string | null;
}

export function useAppState() {
  const [data, setData] = useState<AppStateData>({
    state: 'UPLOAD',
    videoUrl: null,
    videoName: null,
    source: null,
    error: null,
  });

  /** Apply a resolved source: playable -> player, youtube -> embed card. */
  const setSource = useCallback((info: VideoSourceInfo) => {
    setData((d) => ({
      ...d,
      state: info.playable ? 'IDLE' : 'YOUTUBE',
      videoUrl: info.url,
      videoName: info.title,
      source: info,
    }));
  }, []);

  const setState = useCallback((state: AppStateData['state']) => {
    setData((d) => ({ ...d, state }));
  }, []);

  const setError = useCallback((error: string) => {
    setData((d) => ({ ...d, state: 'ERROR', error }));
  }, []);

  return { data, setSource, setState, setError };
}
