/**
 * make-campaign-playable D2: the campaign record in `localStorage`. Storage
 * that throws (a private window, blocked site data) leaves an in-memory copy,
 * so the campaign stays playable for the session.
 */
import { emptyProgress, parseProgress, type CampaignProgress } from './progress';

export const CAMPAIGN_STORAGE_KEY = 'prestes.campaign.v1';

/** The part of `Storage` the adapter uses, injectable for tests. */
export type ProgressStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): ProgressStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class CampaignStore {
  /** The session's copy: what was last read or written, kept when storage fails. */
  private memory: CampaignProgress | null = null;

  constructor(private readonly storage: ProgressStorage | null = defaultStorage()) {}

  load(): CampaignProgress {
    try {
      const raw = this.storage?.getItem(CAMPAIGN_STORAGE_KEY);
      if (raw !== null && raw !== undefined) {
        this.memory = parseProgress(raw);
        return this.memory;
      }
    } catch {
      // Unreadable storage: the session's copy stands in.
    }
    return this.memory ?? emptyProgress();
  }

  save(progress: CampaignProgress): void {
    this.memory = progress;
    try {
      this.storage?.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Unwritable storage: kept in memory for the session.
    }
  }

  /** "Restart campaign": forget every result. */
  clear(): void {
    this.memory = emptyProgress();
    try {
      this.storage?.removeItem(CAMPAIGN_STORAGE_KEY);
    } catch {
      // Unwritable storage: the in-memory record is cleared all the same.
    }
  }
}

let shared: CampaignStore | null = null;

/** The game's store, over the window's `localStorage`. */
export function campaignStore(): CampaignStore {
  shared ??= new CampaignStore();
  return shared;
}
