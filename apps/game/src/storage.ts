import { resolveLocale, type Locale } from '@prestes/content';

const LOCALE_STORAGE_KEY = 'prestes.locale';
const AUDIO_STORAGE_KEY = 'prestes.audio.v1';
const ROUTES_STORAGE_KEY = 'prestes.routes.v1';

/** Whether the movement routes of orders are drawn (default: shown). */
export function loadRoutesVisible(): boolean {
  try {
    return window.localStorage.getItem(ROUTES_STORAGE_KEY) !== 'hidden';
  } catch {
    return true;
  }
}

export function saveRoutesVisible(visible: boolean): void {
  try {
    window.localStorage.setItem(ROUTES_STORAGE_KEY, visible ? 'shown' : 'hidden');
  } catch {
    // Storage can be unavailable; the session keeps the current choice.
  }
}

export function loadAudioSettings(): { muted: boolean; volume: number } {
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { muted?: unknown; volume?: unknown };
      return {
        muted: parsed.muted === true,
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.35,
      };
    }
  } catch {
    // Storage can be unavailable; audio still works for this session.
  }
  return { muted: false, volume: 0.35 };
}

export function saveAudioSettings(settings: { muted: boolean; volume: number }): void {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable; the session keeps the current settings.
  }
}

export function loadLocale(): Locale {
  try {
    return resolveLocale(navigator.language, window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return resolveLocale(navigator.language, null);
  }
}

/** Keys the retired bootcamp saved its progress under (retire-bootcamp). */
export const BOOTCAMP_PROGRESS_KEYS = ['prestes.bootcamp.stations.v2', 'prestes.bootcamp.exercise.v1', 'prestes.bootcamp.steps.v1'];

/** Removes any saved bootcamp progress: the bootcamp is no longer in the game. */
export function clearBootcampProgress(storage: Storage | null = safeStorage()): void {
  if (!storage) return;
  for (const key of BOOTCAMP_PROGRESS_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable; nothing to clear then.
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable; the session still keeps the selected locale.
  }
}
