import { describe, expect, it } from 'vitest';
import { acceptPlan, runAccept, type AcceptPlan } from '../../tools/maps-accept';
import { mergeMapGolden, type DeterminismGolden } from '../../tools/golden-merge';

const IDS = ['campo-de-provas', 'serra-nova', 'copacabana'];

// make-campaign-playable 3.3: one map's edit accepted in one step.
describe('make-campaign-playable 3.3: maps:accept', () => {
  it('re-records only that map, keeping the other maps and the base hash', () => {
    const golden: DeterminismGolden = {
      seed: 1922,
      ticks: 600,
      hash: 'base',
      battleMaps: { 'campo-de-provas': 'aaaa', 'serra-nova': 'bbbb', copacabana: 'cccc' },
      mixedRosters: { 'campo-de-provas': 'mmmm' },
      reason: 'earlier',
    };
    const merged = mergeMapGolden(golden, 'serra-nova', { battle: 'eeee' }, 'moved the ford');
    expect(merged).toEqual({ ...golden, battleMaps: { 'campo-de-provas': 'aaaa', 'serra-nova': 'eeee', copacabana: 'cccc' }, reason: 'serra-nova: moved the ford' });
    expect(mergeMapGolden(golden, 'campo-de-provas', { battle: 'ffff', mixed: 'nnnn' }, 'x').mixedRosters).toEqual({ 'campo-de-provas': 'nnnn' });
    expect(golden.battleMaps!['serra-nova']).toBe('bbbb');
  });

  it('refuses a missing reason, an unknown id and no id', () => {
    expect(acceptPlan(['serra-nova'], IDS)).toEqual({ error: 'a reason is required: --reason "<why>"' });
    expect(acceptPlan(['serra-nova', '--reason', '  '], IDS)).toEqual({ error: 'a reason is required: --reason "<why>"' });
    expect(acceptPlan(['nowhere', '--reason', 'x'], IDS)).toEqual({ error: 'unknown authored map: nowhere' });
    expect('error' in acceptPlan(['--reason', 'x'], IDS)).toBe(true);
  });

  it('checks the map first, then re-records its goldens with the reason, then redraws its preview', () => {
    const plan = acceptPlan(['--reason', 'moved the ford', 'serra-nova'], IDS) as AcceptPlan;
    expect(plan.steps.map((step) => step.args)).toEqual([
      ['tools/check-maps.ts', '--map', 'serra-nova'],
      ['tools/check-determinism.ts', '--update', '--map', 'serra-nova', '--reason', 'moved the ford'],
      ['tools/map-previews.ts', 'serra-nova'],
    ]);
    const dry = acceptPlan(['serra-nova', '--dry-run'], IDS) as AcceptPlan;
    expect(dry.steps.map((step) => step.args.join(' '))).toEqual(['tools/check-maps.ts --map serra-nova', 'tools/check-determinism.ts --map serra-nova']);
  });

  it('a map without a preview (a campaign map) gets no preview step', () => {
    const plan = acceptPlan(['serra-nova', '--reason', 'x'], IDS, ['campo-de-provas']) as AcceptPlan;
    expect(plan.steps.map((step) => step.name)).toEqual(['map check', 'determinism goldens']);
  });

  it('a failing map check stops before anything is written', () => {
    const plan = acceptPlan(['serra-nova', '--reason', 'x'], IDS) as AcceptPlan;
    const ran: string[] = [];
    const code = runAccept(plan, (args) => {
      ran.push(args[0]!);
      return args[0] === 'tools/check-maps.ts' ? 1 : 0;
    }, () => undefined);
    expect(code).toBe(1);
    expect(ran).toEqual(['tools/check-maps.ts']);
    const all: string[] = [];
    expect(runAccept(plan, (args) => (all.push(args[0]!), 0), () => undefined)).toBe(0);
    expect(all).toEqual(['tools/check-maps.ts', 'tools/check-determinism.ts', 'tools/map-previews.ts']);
  });
});
