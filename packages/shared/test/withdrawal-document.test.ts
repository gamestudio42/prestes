import { describe, expect, it } from 'vitest';
import { MAP_DOCUMENT_VERSION, compileMapDocument, createEditableMap, exitAt, nearestExitPoint, parseMapDocument, toMapDocument, type Withdrawal } from '../src';

// add-withdrawal-exits 1.1: exits and the requirement in the map document (version 10).
const WITHDRAWAL: Withdrawal = {
  exits: [
    { id: 1, name: { en: 'Uruguay crossing', 'pt-BR': 'Passo do Uruguai' }, polygon: [{ x: -100, y: -10 }, { x: -90, y: -10 }, { x: -90, y: 10 }, { x: -100, y: 10 }] },
    { id: 2, name: { en: 'North road', 'pt-BR': 'Estrada norte' }, polygon: [{ x: -10, y: -100 }, { x: 10, y: -100 }, { x: 0, y: -90 }] },
  ],
  requirement: { sections: 2, command: true },
};

function documentWith(withdrawal?: Withdrawal) {
  const map = createEditableMap({ id: 'withdrawal-doc', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
  return toMapDocument({ ...map, ...(withdrawal ? { withdrawal } : {}) });
}

describe('withdrawal in the map document', () => {
  it('a version 9 file opens with no withdrawal and saves as version 10', () => {
    const parsed = parseMapDocument({ ...documentWith(), version: 9 });
    if (!parsed.ok) throw new Error(parsed.detail);
    expect(MAP_DOCUMENT_VERSION).toBe(10);
    expect(parsed.document.version).toBe(10);
    expect(parsed.document.withdrawal).toBeUndefined();
    expect(compileMapDocument(parsed.document).withdrawal).toBeUndefined();
  });

  it('round-trips the exits and the requirement, and compiles them', () => {
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(documentWith(WITHDRAWAL))));
    if (!parsed.ok) throw new Error(parsed.detail);
    expect(parsed.document.withdrawal).toEqual(WITHDRAWAL);
    expect(compileMapDocument(parsed.document).withdrawal).toEqual(WITHDRAWAL);
  });

  it('refuses a malformed withdrawal', () => {
    expect(parseMapDocument(documentWith({ ...WITHDRAWAL, requirement: { sections: 1 } as never }))).toMatchObject({ ok: false, detail: 'withdrawal' });
    expect(parseMapDocument(documentWith({ ...WITHDRAWAL, exits: [{ ...WITHDRAWAL.exits[0]!, polygon: [{ x: 0, y: 0 }] }] }))).toMatchObject({ ok: false, detail: 'withdrawal' });
  });

  it('compiles no withdrawal without an exit, and a requirement of at least 1', () => {
    const map = createEditableMap({ id: 'withdrawal-doc', size: 'small' });
    expect(compileMapDocument(toMapDocument({ ...map, withdrawal: { exits: [], requirement: { sections: 2, command: false } } })).withdrawal).toBeUndefined();
    expect(compileMapDocument(toMapDocument({ ...map, withdrawal: { ...WITHDRAWAL, requirement: { sections: 0, command: false } } })).withdrawal?.requirement.sections).toBe(1);
  });

  it('finds the exit a point stands in and the nearest point of an exit', () => {
    expect(exitAt(WITHDRAWAL, -95, 0)?.id).toBe(1);
    expect(exitAt(WITHDRAWAL, 0, 0)).toBeNull();
    expect(nearestExitPoint(WITHDRAWAL.exits[0]!, { x: -50, y: 0 })).toEqual({ x: -90, y: 0 });
  });
});
