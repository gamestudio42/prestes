import { useSyncExternalStore } from 'react';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../storage';
import type { Bus } from './mixer';

/**
 * ambient-sound-and-voices 2.1: the mute and channel volumes, one store for
 * the battle's top bar, the options compass and the audio engine, saved on
 * every change.
 */
let current: AudioSettings | null = null;
const listeners = new Set<() => void>();

function settings(): AudioSettings {
  current ??= loadAudioSettings();
  return current;
}

function set(next: AudioSettings): void {
  current = next;
  saveAudioSettings(next);
  for (const listener of listeners) listener();
}

export const audioSettings = {
  get: settings,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  toggleMuted(): void {
    set({ ...settings(), muted: !settings().muted });
  },
  setChannel(bus: Bus, volume: number): void {
    set({ ...settings(), [bus]: Math.max(0, Math.min(1, volume)) });
  },
  /** ambient-sound-and-voices D11: soldiers' curses on or off. */
  setCurses(on: boolean): void {
    set({ ...settings(), curses: on });
  },
  /** Tests: forget the cached settings so the next read is from storage. */
  reset(): void {
    current = null;
  },
};

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(audioSettings.subscribe, audioSettings.get, audioSettings.get);
}
