export const SOURCE_KEYS = [
  'macaulay-1974',
  'blanc-2024',
  'amado-1942',
  'lima-1931',
  'joao-alberto-1954',
  'tavora-1928',
  'anita-1991',
  'helio-1922',
  'helio-1926',
  'meirelles-1995',
  'brum-1994',
  'castro-2016',
  'castro-2022',
  'campoi-2001',
  'carvalho-2001',
  'tecchio-2021',
  'silva-2022',
  'vitor-2011',
  'xavier-2011',
  'teles-2008',
  'castro-chico-2008',
  'ferreira-1980',
  'otaviano-1979',
  'bandeira-2013',
  'mvcp-portal',
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];

export function isSourceKey(value: string): value is SourceKey {
  return (SOURCE_KEYS as readonly string[]).includes(value);
}
