import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_CHAPTERS,
  CHAPTER_TEXT,
  COMPENDIUM,
  COMPENDIUM_TEXT,
  validateQuotes,
  type CompendiumText,
  type Quote,
} from '../src';

const manifesto: Quote = {
  text: 'queremos a paz e não é senão por ela que, há mais de 15 meses, nos batemos',
  sourceKey: 'manifesto-1925',
  cite: 'Manifesto da Coluna Prestes, Porto Nacional, 19 out. 1925',
  attribution: 'Miguel Costa, Luís Carlos Prestes e Juarez Távora, Porto Nacional, 19 de outubro de 1925',
};
const translated: Quote = { ...manifesto, text: 'we want peace, and it is for peace alone that we have fought', translated: true };

const note = (quote?: Quote): CompendiumText => ({ note: [{ paragraphs: ['Text.'], ...(quote ? { quote } : {}) }] });

const run = (pt?: Quote, en?: Quote, entries = [{ id: 'x', sourceRefs: ['macaulay-1974'] }], chapters: { id: string; sourceRefs: string[] }[] = []) =>
  validateQuotes({ 'pt-BR': { x: note(pt) }, en: { x: note(en) } }, { 'pt-BR': {}, en: {} }, entries, chapters);

describe('validateQuotes', () => {
  it('accepts a free-licence quotation with a marked translation', () => {
    expect(run(manifesto, translated)).toEqual([]);
  });

  it('rejects a copyrighted source', () => {
    const helio = { ...manifesto, sourceKey: 'helio-1922' };
    const errors = run(helio, { ...helio, translated: true });
    expect(errors.some((e) => e.includes('helio-1922') && e.includes('copyrighted'))).toBe(true);
  });

  it('rejects an unknown source key', () => {
    const bad = { ...manifesto, sourceKey: 'not-a-source' };
    expect(run(bad, { ...bad, translated: true }).some((e) => e.includes('unknown source: not-a-source'))).toBe(true);
  });

  it('rejects an EN quotation not marked as a translation', () => {
    expect(run(manifesto, { ...translated, translated: false }).some((e) => e.includes('not marked as a translation'))).toBe(true);
  });

  it('rejects a locale mismatch in source or cite, or a missing twin', () => {
    expect(run(manifesto, { ...translated, cite: 'other' }).some((e) => e.includes('differs in source or cite'))).toBe(true);
    expect(run(manifesto, undefined).some((e) => e.includes('no counterpart in en'))).toBe(true);
  });

  it('rejects a quotation over the word limit', () => {
    const long = { ...manifesto, text: Array.from({ length: 61 }, () => 'palavra').join(' ') };
    expect(run(long, { ...long, translated: true }).some((e) => e.includes('61 words'))).toBe(true);
  });

  it('rejects citing a source that has not been consulted', () => {
    const errors = run(undefined, undefined, [{ id: 'x', sourceRefs: ['superoitocine-2012'] }], [{ id: 'c', sourceRefs: ['superoitocine-2012'] }]);
    expect(errors).toContain('compendium entry x cites superoitocine-2012, which has not been consulted');
    expect(errors).toContain('chapter c cites superoitocine-2012, which has not been consulted');
  });

  it('passes on the shipped content', () => {
    expect(validateQuotes(COMPENDIUM_TEXT, CHAPTER_TEXT, COMPENDIUM, CAMPAIGN_CHAPTERS)).toEqual([]);
  });
});
