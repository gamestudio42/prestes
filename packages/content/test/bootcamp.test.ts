import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE } from '../src/bootcamp-exercise';
import { ORDER_CATALOG } from '../src/order-catalog';
import { messages } from '../src/locales';

describe('bootcamp exercise content', () => {
  it('defines the three ordered phases and their objectives', () => {
    expect(BOOTCAMP_EXERCISE.phases.map((phase) => phase.id)).toEqual([
      'assembly',
      'assault',
      'hold',
    ]);
    expect(BOOTCAMP_EXERCISE.phases[0]?.objectives[0]?.kind).toBe('reach');
    expect(BOOTCAMP_EXERCISE.phases[1]?.objectives.map((objective) => objective.kind)).toEqual([
      'suppress',
      'secure',
    ]);
    expect(BOOTCAMP_EXERCISE.phases[2]?.objectives.map((objective) => objective.kind)).toEqual([
      'hold',
      'protect-officer',
    ]);
  });

  it('teaches every current order through contextual drills', () => {
    const drills = new Set(BOOTCAMP_EXERCISE.phases.flatMap((phase) => phase.drills));
    const idToAction: Record<string, string> = {
      aim: 'face',
    };
    for (const order of ORDER_CATALOG) {
      expect(drills.has((idToAction[order.id] ?? order.id) as never)).toBe(true);
    }
  });

  it('has localized phase and objective keys and no select-all drill', () => {
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
          expect(keys.has(key)).toBe(true);
        }
        for (const objective of phase.objectives) {
          expect(keys.has(objective.labelKey)).toBe(true);
        }
      }
    }
    const drills = new Set(BOOTCAMP_EXERCISE.phases.flatMap((phase) => phase.drills));
    expect(drills.has('select-all' as never)).toBe(false);
  });
});
