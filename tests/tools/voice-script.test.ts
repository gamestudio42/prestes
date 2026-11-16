import { describe, expect, it } from 'vitest';
import type { VoiceLine } from '../../packages/content/src';
import { audioReport, voiceScript } from '../../tools/voice-script';

// ambient-sound-and-voices 5.2: the voice script and the audio check, on fixtures.

const lines: VoiceLine[] = [
  { speaker: 'comandante', kind: 'order', key: 'hold', takes: [{ pt: 'Alto!', en: 'Halt!' }, { pt: 'Parem!', en: 'Stop!' }] },
  { speaker: 'xingamento/column', kind: 'curse', key: '05', moment: 'fire', takes: [{ pt: 'Toma!', en: 'Take that!' }] },
];
const files = { 'comandante/hold-1': 'voice/comandante/hold-1.mp3', 'xingamento/column/05-1': 'voice/xingamento/column/05-1.mp3', 'water-sea': 'water/water-sea.mp3' };
const sizes = { 'voice/comandante/hold-1.mp3': 1000, 'voice/xingamento/column/05-1.mp3': 1000, 'water/water-sea.mp3': 5000 };
const budget = { totalMaxBytes: 10_000, voiceMaxBytes: 5000 };
const register = '| Voice lines | `apps/game/public/audio/voice/<speaker>/<line>.mp3` |\n| `water-sea` | `apps/game/public/audio/water/water-sea.mp3` |';

describe('the audio check', () => {
  it('passes a clean set and lists a take without a recording', () => {
    const report = audioReport({ lines, files, sizes, budget, register });
    expect(report.problems).toEqual([]);
    expect(report.missing).toEqual(['comandante/hold-2']);
    expect(report.orphans).toEqual([]);
  });

  it('lists a voice file without a line', () => {
    const report = audioReport({ lines, files: { ...files, 'soldado/old-1': 'voice/soldado/old-1.mp3' }, sizes, budget, register });
    expect(report.orphans).toEqual(['soldado/old-1']);
  });

  it('fails over the budget', () => {
    expect(audioReport({ lines, files, sizes, budget: { totalMaxBytes: 6000, voiceMaxBytes: 1500 }, register }).problems).toEqual([
      'audio set is 7000 bytes, over the budget of 6000; largest: water/water-sea.mp3 5000, voice/comandante/hold-1.mp3 1000, voice/xingamento/column/05-1.mp3 1000',
      'voice files are 2000 bytes, over the budget of 1500',
    ]);
  });

  it('fails on a file missing from the asset register', () => {
    const report = audioReport({ lines, files: { ...files, 'bird-new': 'oneshots/bird-new.mp3' }, sizes, budget, register });
    expect(report.problems).toEqual(['audio file not in docs/assets.md: oneshots/bird-new.mp3 (bird-new)']);
  });

  it('writes the script with each take marked recorded or to record', () => {
    const report = audioReport({ lines, files, sizes, budget, register });
    const script = voiceScript(lines, files, report);
    expect(script).toContain('**2 de 3 tomadas gravadas.**');
    expect(script).toContain('| hold | `comandante/hold-1` | Alto! | Halt! | ✓ |');
    expect(script).toContain('|  | `comandante/hold-2` | Parem! | Stop! | · |');
    expect(script).toContain('| 05 | fire | `xingamento/column/05-1` | Toma! | Take that! | ✓ |');
    expect(script).toContain('## A gravar');
  });
});
