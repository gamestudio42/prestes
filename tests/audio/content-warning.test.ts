import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT_WARNING_VERSION, contentWarningAcknowledged, saveContentWarningAcknowledged } from '../../apps/game/src/storage';

// ambient-sound-and-voices D11: the content warning shows on the first
// opening and again only for a newer version of its text.

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const KEY = 'prestes.contentWarning.v1';

describe('the content warning acknowledgement', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('is not acknowledged on a first opening', () => {
    expect(contentWarningAcknowledged()).toBe(false);
  });

  it('stays acknowledged once accepted', () => {
    saveContentWarningAcknowledged();
    expect(JSON.parse(storage.getItem(KEY)!)).toEqual({ version: CONTENT_WARNING_VERSION });
    expect(contentWarningAcknowledged()).toBe(true);
  });

  it('shows again for an older version or nonsense', () => {
    storage.setItem(KEY, JSON.stringify({ version: CONTENT_WARNING_VERSION - 1 }));
    expect(contentWarningAcknowledged()).toBe(false);
    storage.setItem(KEY, 'yes');
    expect(contentWarningAcknowledged()).toBe(false);
  });

  it('shows every time when storage cannot be read', () => {
    (globalThis as unknown as { window: unknown }).window = {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    };
    expect(contentWarningAcknowledged()).toBe(false);
    expect(() => saveContentWarningAcknowledged()).not.toThrow();
  });
});
