import { publicUrl } from '@prestes/shared';
import { SOUND_FILES } from './sound-files';

/**
 * ambient-sound-and-voices 3.2: the battle's recordings, fetched and decoded
 * when first asked for and kept. Only files in `SOUND_FILES` are requested,
 * so a sound with no file is silent without a failed request; a file that
 * fails to load stays silent too.
 */
export class SoundBank {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly pending = new Set<string>();
  private readonly failed = new Set<string>();

  constructor(
    private readonly context: () => BaseAudioContext | null,
    private readonly files: Readonly<Record<string, string>> = SOUND_FILES,
    private readonly base = './audio/',
  ) {}

  /** Whether the sound has a file at all. */
  exists(id: string): boolean {
    return id in this.files;
  }

  /** The decoded sound, or null; asking starts its loading. */
  get(id: string): AudioBuffer | null {
    const buffer = this.buffers.get(id);
    if (buffer) return buffer;
    this.request(id);
    return null;
  }

  request(id: string): void {
    const path = this.files[id];
    const context = this.context();
    if (!path || !context || this.pending.has(id) || this.failed.has(id) || this.buffers.has(id)) return;
    this.pending.add(id);
    void (async () => {
      try {
        const response = await fetch(publicUrl(`${this.base}${path}`));
        if (!response.ok) throw new Error(String(response.status));
        this.buffers.set(id, await context.decodeAudioData(await response.arrayBuffer()));
      } catch {
        this.failed.add(id);
      } finally {
        this.pending.delete(id);
      }
    })();
  }
}
