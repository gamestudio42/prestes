import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE, CURRICULUM } from '../src/bootcamp-exercise';
import { ORDER_CATALOG } from '../src/order-catalog';
import { messages } from '../src/locales';

const objectives = BOOTCAMP_EXERCISE.phases.flatMap((phase) => phase.objectives);

describe('bootcamp exercise content', () => {
  it('defines the seven ordered stations', () => {
    expect(BOOTCAMP_EXERCISE.phases.map((phase) => phase.id)).toEqual([
      'formation',
      'fire',
      'maneuver',
      'defense',
      'recon',
      'wounded',
      'final',
    ]);
    expect(BOOTCAMP_EXERCISE.phases.every((phase) => phase.objectives.length > 0)).toBe(true);
  });

  it('requires every curriculum mechanic in at least one objective', () => {
    const missing = CURRICULUM.filter(({ covered }) => !objectives.some(covered)).map(
      ({ mechanic }) => mechanic,
    );
    expect(missing).toEqual([]);
  });

  it('requires every order in the order catalogue', () => {
    // Orders map to the objective that proves their effect.
    const required: Record<string, (kind: string, order?: string) => boolean> = {
      attack: (kind) => kind === 'target-hit',
      suppress: (kind) => kind === 'suppress',
      move: (kind) => kind === 'reach',
      withdraw: (kind) => kind === 'withdraw-out',
      hold: (_kind, order) => order === 'hold',
      aim: (kind) => kind === 'facing',
      flank: (kind) => kind === 'flank-position',
      rescue: (kind) => kind === 'rescue-complete',
      recon: (kind) => kind === 'recon-report',
      ambush: (kind) => kind === 'ambush-trigger',
      pursue: (kind) => kind === 'pursue',
      defend: (kind) => kind === 'defend-in-cover',
      advance: (_kind, order) => order === 'advance',
      disperse: (kind) => kind === 'open-order',
      reserve: (_kind, order) => order === 'defend',
      regroup: (kind) => kind === 'regroup',
    };
    for (const entry of ORDER_CATALOG) {
      const check = required[entry.id];
      expect(check, `no objective rule for order ${entry.id}`).toBeDefined();
      expect(
        objectives.some((objective) => check!(objective.kind, objective.order)),
        `order ${entry.id} is not required by any objective`,
      ).toBe(true);
    }
  });

  it('has localized station and objective keys in every locale', () => {
    for (const locale of [messages.en, messages['pt-BR']]) {
      const keys = new Set(Object.keys(locale));
      for (const phase of BOOTCAMP_EXERCISE.phases) {
        for (const key of [
          phase.titleKey,
          phase.objectiveKey,
          phase.briefingKey,
          phase.hintKey,
          phase.instructorKey,
        ]) {
          expect(keys.has(key), key).toBe(true);
        }
        for (const objective of phase.objectives) {
          expect(keys.has(objective.labelKey), objective.labelKey).toBe(true);
          expect(keys.has(objective.instructorKey), objective.instructorKey).toBe(true);
        }
      }
    }
  });

  it('asks for the same number of soldiers in every locale and in the rule', () => {
    const reach = objectives.find((objective) => objective.id === 'formation-reach')!;
    expect(reach.minUnits).toBe(5);
    expect(messages.en[reach.instructorKey]).toMatch(/Five/);
    expect(messages['pt-BR'][reach.instructorKey]).toMatch(/Cinco/);
  });
});
