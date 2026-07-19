// Typed event bus. The core emits, the UI listens. Never the other way around.

export interface HandFrame {
  landmarks: { x: number; y: number; z: number }[]; // 21 normalized points [0,1]
  timestamp: number;
}

export interface DebugData {
  rawPinch: number;
  smoothPinch: number;
  velocity: number;
  fps: number;
  time: number;      // current video time (s)
  duration: number;  // video duration (s)
}

export type AppState =
  | 'IDLE'
  | 'REQUESTING_CAMERA'
  | 'LOADING_MODEL'
  | 'READY'
  | 'TRACKING'
  | 'HAND_LOST'
  | 'ERROR';

export interface EngineEvents {
  stateChange: AppState;
  handFrame: HandFrame | null;
  debugData: DebugData;
  error: string;
}

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof EngineEvents, Set<Listener<never>>>();

  on<K extends keyof EngineEvents>(event: K, fn: Listener<EngineEvents[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn as Listener<never>);
    return () => this.listeners.get(event)?.delete(fn as Listener<never>);
  }

  emit<K extends keyof EngineEvents>(event: K, payload: EngineEvents[K]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as Listener<EngineEvents[K]>)(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
