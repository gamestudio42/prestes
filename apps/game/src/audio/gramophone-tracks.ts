/**
 * The menu gramophone program: public-domain Brazilian recordings supplied by
 * the project owner. Metadata and per-recording source pages come from
 * Discografia Brasileira (https://discografiabrasileira.com.br), matched by
 * the catalog numbers carried by the source files. The files in
 * `apps/game/public/music/` are the optimized copies described in
 * docs/assets.md; the originals stay in the gitignored `gramofone/` folder.
 */
export interface GramophoneTrack {
  id: string;
  file: string;
  title: string;
  composer: string;
  performer: string;
  year: number;
  genre: string;
  genreEn: string;
  label: string;
  catalog: string;
  publicDomainYear: number;
  source: string;
}

export const GRAMOPHONE_TRACKS: readonly GramophoneTrack[] = [
  {
    id: 'plangente',
    file: 'plangente.mp3',
    title: 'Plangente',
    composer: 'Ernesto Nazareth',
    performer: 'Orquestra Rio Artists',
    year: 1928,
    genre: 'Tanguinho',
    genreEn: 'Tanguinho',
    label: 'Odeon',
    catalog: 'OR10137a',
    publicDomainYear: 2005,
    source: 'https://discografiabrasileira.com.br/fonograma/22749/plangente-odeon-10137',
  },
  {
    id: 'escovado',
    file: 'escovado.mp3',
    title: 'Escovado',
    composer: 'Ernesto Nazareth',
    performer: 'Banda do 1º Regimento da Força Policial',
    year: 1905,
    genre: 'Tango',
    genreEn: 'Tango',
    label: 'Odeon R',
    catalog: 'OR10149',
    publicDomainYear: 2005,
    source: 'https://discografiabrasileira.com.br/fonograma/8224/escovado-odeon-r-10149',
  },
  {
    id: 'argentina',
    file: 'argentina.mp3',
    title: 'Argentina',
    composer: 'Chiquinha Gonzaga',
    performer: 'Chiquinha Gonzaga',
    year: 1920,
    genre: 'Habanera',
    genreEn: 'Habanera',
    label: 'Popular R',
    catalog: 'PoR4000',
    publicDomainYear: 2006,
    source: 'https://discografiabrasileira.com.br/fonograma/185751/argentina-popular-r-4000',
  },
  {
    id: 'menino-de-ouro',
    file: 'menino-de-ouro.mp3',
    title: 'Menino de Ouro',
    composer: 'Ernesto Nazareth',
    performer: 'Banda do Corpo de Bombeiros',
    year: 1920,
    genre: 'Tango',
    genreEn: 'Tango',
    label: 'Odeon R',
    catalog: 'OR121712',
    publicDomainYear: 2005,
    source:
      'https://discografiabrasileira.com.br/fonograma/13624/menino-de-ouro-odeon-r-121712',
  },
  {
    id: 'aristides-sai-da-toca',
    file: 'aristides-sai-da-toca.mp3',
    title: 'Aristides Sai da Toca',
    composer: 'José Napolitano',
    performer: 'Bahiano; Manuel Pedro dos Santos',
    year: 1921,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon R',
    catalog: 'OR121920',
    publicDomainYear: 1992,
    source:
      'https://discografiabrasileira.com.br/fonograma/15657/aristides-sai-da-toca-odeon-r-121920-121921',
  },
  {
    id: 'o-protocolo',
    file: 'o-protocolo.mp3',
    title: 'O Protocolo',
    composer: 'B. Silvestre',
    performer: 'Bahiano; Manuel Pedro dos Santos',
    year: 1921,
    genre: 'Cançoneta',
    genreEn: 'Canzonetta',
    label: 'Odeon R',
    catalog: 'OR121921',
    publicDomainYear: 1992,
    source:
      'https://discografiabrasileira.com.br/fonograma/15660/o-protocolo-odeon-r-121920-121921',
  },
  {
    id: 'pegue-na-cartilha',
    file: 'pegue-na-cartilha.mp3',
    title: 'Pegue na Cartilha',
    composer: 'Sinhô',
    performer: 'Bahiano; Manuel Pedro dos Santos',
    year: 1923,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon R',
    catalog: 'OR122422',
    publicDomainYear: 2001,
    source:
      'https://discografiabrasileira.com.br/fonograma/16328/pegue-na-cartilha-odeon-r-122422',
  },
  {
    id: 'lua-branca-lua-de-fulgores',
    file: 'lua-branca-lua-de-fulgores.mp3',
    title: 'Lua Branca (Lua de Fulgores)',
    composer: 'Chiquinha Gonzaga',
    performer: 'Paraguassu; Américo Jacomino “Canhoto”',
    year: 1926,
    genre: 'Modinha',
    genreEn: 'Modinha',
    label: 'Odeon R',
    catalog: 'OR122938',
    publicDomainYear: 2006,
    source:
      'https://discografiabrasileira.com.br/fonograma/17779/lua-branca-lua-de-fulgores-odeon-r-122938',
  },
  {
    id: 'quem-fala-de-mim-tem-paixao',
    file: 'quem-fala-de-mim-tem-paixao.mp3',
    title: 'Quem Fala de Mim Tem Paixão',
    composer: 'Sinhô',
    performer: 'Pedro Celestino; American Jazz Band',
    year: 1926,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon R',
    catalog: 'OR123027',
    publicDomainYear: 2001,
    source:
      'https://discografiabrasileira.com.br/fonograma/13177/quem-fala-de-mim-tem-paixao-odeon-r-123026-123027',
  },
  {
    id: 'proeminente',
    file: 'proeminente.mp3',
    title: 'Proeminente',
    composer: 'Ernesto Nazareth',
    performer: 'Orquestra Pan American do Cassino Copacabana',
    year: 1927,
    genre: 'Maxixe',
    genreEn: 'Maxixe',
    label: 'Odeon',
    catalog: 'O10087a',
    publicDomainYear: 2005,
    source: 'https://discografiabrasileira.com.br/fonograma/9696/proeminente-odeon-10087',
  },
  {
    id: 'a-favela-vai-abaixo',
    file: 'a-favela-vai-abaixo.mp3',
    title: 'A Favela Vai Abaixo',
    composer: 'Sinhô',
    performer: 'Francisco Alves',
    year: 1928,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon',
    catalog: 'O10096a',
    publicDomainYear: 2001,
    source:
      'https://discografiabrasileira.com.br/fonograma/21817/a-favela-vai-abaixo-odeon-10096',
  },
  {
    id: 'tesourinha',
    file: 'tesourinha.mp3',
    title: 'Tesourinha',
    composer: 'Sinhô',
    performer: 'Francisco Alves',
    year: 1928,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon',
    catalog: 'O10147a',
    publicDomainYear: 2001,
    source: 'https://discografiabrasileira.com.br/fonograma/24159/tesourinha-odeon-10147',
  },
  {
    id: 'vadiagem',
    file: 'vadiagem.mp3',
    title: 'Vadiagem',
    composer: 'Francisco Alves',
    performer: 'Mário Reis',
    year: 1929,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon',
    catalog: 'O10307a',
    publicDomainYear: 2023,
    source: 'https://discografiabrasileira.com.br/fonograma/26836/vadiagem-odeon-10307',
  },
  {
    id: 'carga-de-burro',
    file: 'carga-de-burro.mp3',
    title: 'Carga de Burro',
    composer: 'Sinhô',
    performer: 'Mário Reis',
    year: 1929,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon',
    catalog: 'O10387b',
    publicDomainYear: 2001,
    source:
      'https://discografiabrasileira.com.br/fonograma/17017/carga-de-burro-odeon-10387',
  },
  {
    id: 'golpe-errado',
    file: 'golpe-errado.mp3',
    title: 'Golpe Errado',
    composer: 'Francisco Alves',
    performer: 'Francisco Alves',
    year: 1929,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Odeon',
    catalog: 'O10484b',
    publicDomainYear: 2023,
    source: 'https://discografiabrasileira.com.br/fonograma/28551/golpe-errado-odeon-10484',
  },
  {
    id: 'malandro-medroso',
    file: 'malandro-medroso.mp3',
    title: 'Malandro Medroso',
    composer: 'Noel Rosa',
    performer: 'Noel Rosa; Bando Regional',
    year: 1930,
    genre: 'Samba',
    genreEn: 'Samba',
    label: 'Parlophon',
    catalog: 'P13245b',
    publicDomainYear: 2008,
    source:
      'https://discografiabrasileira.com.br/fonograma/49975/malandro-medroso-parlophon-13245',
  },
  {
    id: 'tenho-um-segredo',
    file: 'tenho-um-segredo.mp3',
    title: 'Tenho um Segredo',
    composer: 'Custódio Mesquita',
    performer: 'Silvio Caldas; Grupo dos Piratas',
    year: 1932,
    genre: 'Fox Canção',
    genreEn: 'Fox song',
    label: 'Victor',
    catalog: 'V33588b',
    publicDomainYear: 2016,
    source:
      'https://discografiabrasileira.com.br/fonograma/39291/tenho-um-segredo-victor-33588',
  },
];

/** The index after `index`, wrapping around the program. */
export function nextTrackIndex(index: number, total = GRAMOPHONE_TRACKS.length): number {
  return (index + 1) % total;
}

/** The index before `index`, wrapping around the program. */
export function previousTrackIndex(index: number, total = GRAMOPHONE_TRACKS.length): number {
  return (index - 1 + total) % total;
}

/** A stored index clamped into the program; anything invalid falls back to 0. */
export function clampTrackIndex(index: number, total = GRAMOPHONE_TRACKS.length): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(total - 1, Math.trunc(index)));
}
