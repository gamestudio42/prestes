import { describe, expect, it } from 'vitest';
import { Gramophone, type GramophoneOutput } from '../../apps/game/src/audio/Gramophone';

class FakeOutput implements GramophoneOutput {
  plays: Array<{ src: string; fade: number }> = [];
  loads: string[] = [];
  pauses = 0;
  muted = false;
  currentTime = 0;
  disposed = false;
  private ended: (() => void) | undefined;
  private failed: (() => void) | undefined;

  async play(src: string, fade: number): Promise<boolean> {
    this.plays.push({ src, fade });
    return true;
  }

  pause(): void {
    this.pauses += 1;
  }

  load(src: string): void {
    this.loads.push(src);
    this.currentTime = 0;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  onEnded(callback: () => void): () => void {
    this.ended = callback;
    return () => {
      this.ended = undefined;
    };
  }

  onError(callback: () => void): () => void {
    this.failed = callback;
    return () => {
      this.failed = undefined;
    };
  }

  dispose(): void {
    this.disposed = true;
  }

  end(): void {
    this.ended?.();
  }

  fail(): void {
    this.failed?.();
  }
}

function engineWith(output: FakeOutput, startIndex = 0): Gramophone {
  return new Gramophone({ output, baseUrl: './', startIndex });
}

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Gramophone', () => {
  it('selects a track from the record rack and starts it', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);

    gramophone.select(2);
    await tick();

    expect(gramophone.track.title).toBe('Argentina');
    expect(output.plays.at(-1)).toEqual({ src: './music/argentina.mp3', fade: 3 });
  });

  it('starts on Plangente with the long first fade', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);

    expect(gramophone.track.title).toBe('Plangente');
    await gramophone.play();

    expect(output.plays).toEqual([{ src: './music/plangente.mp3', fade: 3 }]);
    expect(gramophone.getState()).toMatchObject({
      trackIndex: 0,
      playing: true,
      loading: false,
      started: true,
    });
  });

  it('resumes with a short fade and pauses', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);

    await gramophone.play();
    gramophone.pause();
    await gramophone.play();

    expect(output.plays[1]?.fade).toBe(0.4);
    expect(output.pauses).toBe(1);
    expect(gramophone.getState().playing).toBe(true);
  });

  it('starts the selected track when next is the first gesture', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);

    gramophone.next();
    await tick();

    expect(gramophone.getState().trackIndex).toBe(1);
    expect(gramophone.getState().playing).toBe(true);
    expect(output.plays).toEqual([{ src: './music/escovado.mp3', fade: 3 }]);
  });

  it('wraps next and previous and loads the new source while paused', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();
    gramophone.pause();

    gramophone.previous();
    expect(gramophone.getState().trackIndex).toBe(16);
    expect(gramophone.track.title).toBe('Tenho um Segredo');
    expect(output.loads.at(-1)).toBe('./music/tenho-um-segredo.mp3');
    expect(gramophone.getState().playing).toBe(false);

    gramophone.next();
    expect(gramophone.getState().trackIndex).toBe(0);
    expect(gramophone.getState().changeNonce).toBe(2);
    expect(output.loads.at(-1)).toBe('./music/plangente.mp3');
  });

  it('starts the next track while playing', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();

    gramophone.next();
    await tick();

    expect(gramophone.getState().trackIndex).toBe(1);
    expect(gramophone.getState().changeNonce).toBe(1);
    expect(output.plays.at(-1)).toEqual({ src: './music/escovado.mp3', fade: 0.35 });
    expect(gramophone.getState().playing).toBe(true);
  });

  it('advances and keeps playing when a track ends', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();

    output.end();
    await tick();

    expect(gramophone.getState().trackIndex).toBe(1);
    expect(output.plays.at(-1)).toEqual({ src: './music/escovado.mp3', fade: 0.35 });
    expect(gramophone.getState().playing).toBe(true);
  });

  it('restarts the current track when previous is pressed after three seconds', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();
    output.currentTime = 5;

    gramophone.previous();
    await tick();

    expect(gramophone.getState().trackIndex).toBe(0);
    expect(gramophone.getState().changeNonce).toBe(0);
    expect(output.loads.at(-1)).toBe('./music/plangente.mp3');
    expect(output.plays.at(-1)).toEqual({ src: './music/plangente.mp3', fade: 0.35 });

    output.currentTime = 1;
    gramophone.previous();
    await tick();
    expect(gramophone.getState().trackIndex).toBe(16);
  });

  it('pauses on mute and refuses to play until unmuted', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();
    const plays = output.plays.length;

    gramophone.setMuted(true);
    expect(output.muted).toBe(true);
    expect(gramophone.getState().playing).toBe(false);
    expect(output.pauses).toBe(1);

    await gramophone.play();
    expect(output.plays).toHaveLength(plays);

    gramophone.setMuted(false);
    await gramophone.play();
    expect(output.plays).toHaveLength(plays + 1);
  });

  it('reports a media error and keeps the controls available', async () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);
    await gramophone.play();

    output.fail();

    expect(gramophone.getState()).toMatchObject({ playing: false, error: true });
    await gramophone.play();
    expect(output.plays).toHaveLength(2);
  });

  it('disposes the output once', () => {
    const output = new FakeOutput();
    const gramophone = engineWith(output);

    gramophone.dispose();
    gramophone.dispose();

    expect(output.disposed).toBe(true);
  });
});
