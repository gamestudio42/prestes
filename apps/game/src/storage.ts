import { resolveLocale, type Locale } from '@prestes/content';

const LOCALE_STORAGE_KEY = 'prestes.locale';
const AUDIO_STORAGE_KEY = 'prestes.audio.v1';
const ROUTES_STORAGE_KEY = 'prestes.routes.v1';
const GRAMOPHONE_STORAGE_KEY = 'prestes.gramophone.v1';
const GRAPHICS_STORAGE_KEY = 'prestes.graphics.v1';

/** refine-map-editor D4: graphics options; smooth edges (MSAA) default on. */
export interface GraphicsSettings {
  smoothEdges: boolean;
}

export function loadGraphicsSettings(): GraphicsSettings {
  try {
    const raw = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { smoothEdges?: unknown };
      return { smoothEdges: parsed.smoothEdges !== false };
    }
  } catch {
    // Storage can be unavailable; the defaults still draw.
  }
  return { smoothEdges: true };
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  try {
    window.localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable; the session keeps the current choice.
  }
}

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

/**
 * ambient-sound-and-voices 2.1: the mute and the three channel volumes
 * (0 to 1, each the level of its mixer bus). Kept under the same key as the
 * one mute and volume before them: a stored `{ muted, volume }` reads as the
 * mute and the effects volume (the old 0.35 is the effects at full), with
 * ambience and voices at their defaults.
 */
export interface AudioSettings {
  muted: boolean;
  effects: number;
  ambience: number;
  voices: number;
}

export const AUDIO_DEFAULTS: AudioSettings = { muted: false, effects: 1, ambience: 0.8, voices: 1 };
/** The one volume stored before the channels; it was the shots' gain, 0.35 by default. */
const OLD_SHOT_VOLUME = 0.35;

const unit = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null);

/** The settings from what storage held (anything, even nothing). */
export function parseAudioSettings(stored: unknown): AudioSettings {
  if (!stored || typeof stored !== 'object') return { ...AUDIO_DEFAULTS };
  const value = stored as Record<string, unknown>;
  const old = unit(value.volume);
  return {
    muted: value.muted === true,
    effects: unit(value.effects) ?? (old === null ? AUDIO_DEFAULTS.effects : Math.min(1, old / OLD_SHOT_VOLUME)),
    ambience: unit(value.ambience) ?? AUDIO_DEFAULTS.ambience,
    voices: unit(value.voices) ?? AUDIO_DEFAULTS.voices,
  };
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return parseAudioSettings(raw ? JSON.parse(raw) : null);
  } catch {
    // Storage can be unavailable; audio still works for this session.
    return { ...AUDIO_DEFAULTS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable; the session keeps the current settings.
  }
}

/** The menu gramophone's selected track; the engine clamps it to the program. */
export function loadGramophoneTrack(): number {
  try {
    const raw = window.localStorage.getItem(GRAMOPHONE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { track?: unknown };
      if (typeof parsed.track === 'number' && Number.isFinite(parsed.track)) {
        return Math.max(0, Math.trunc(parsed.track));
      }
    }
  } catch {
    // Storage can be unavailable; the first track is still a safe start.
  }
  return 0;
}

export function saveGramophoneTrack(track: number): void {
  try {
    window.localStorage.setItem(
      GRAMOPHONE_STORAGE_KEY,
      JSON.stringify({ track: Math.max(0, Math.trunc(track)) }),
    );
  } catch {
    // Storage can be unavailable; the session keeps the current track.
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
