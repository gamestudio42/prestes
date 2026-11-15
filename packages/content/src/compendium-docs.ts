/**
 * Imported from docs/campaign/compendium/entries (polish-menu-desk, design D12).
 * The docs are the authoring source: edit an entry there and here together.
 */
import type { ContentLabel } from './figures';

/**
 * An image's licence (complete-books-and-bibliography D3, D3a). `permission-pending`
 * images are used under a request to their holder: their files live in the
 * gitignored `art-src/compendium-pending/`, are served by the dev server only,
 * and never reach a commit or a public build.
 */
export type ImageLicence =
  | 'public-domain'
  | 'CC0-1.0'
  | 'CC-BY-4.0'
  | 'CC-BY-SA-3.0'
  | 'CC-BY-SA-4.0'
  | 'permission-pending'
  | 'permission-granted';

export const IMAGE_LICENCES: readonly ImageLicence[] = [
  'public-domain',
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'permission-pending',
  'permission-granted',
];

/** Where the files of images awaiting permission live (gitignored). */
export const PENDING_IMAGE_DIR = 'art-src/compendium-pending/';

/** A compendium image, mirrored from the compendium rows of docs/assets.md. */
export interface RegisteredImage {
  path: string;
  licence: ImageLicence;
  rights: string;
  /** Rights holder asked for permission (pending or granted). */
  holder?: string;
  /** The request or grant file under docs/rights/. */
  request?: string;
}

const A = 'apps/game/public/assets/compendium/';
const P = PENDING_IMAGE_DIR;
const PD = (path: string, rights: string): RegisteredImage => ({ path: `${A}${path}`, licence: 'public-domain', rights });
const FREE = (path: string, licence: ImageLicence, rights: string): RegisteredImage => ({ path: `${A}${path}`, licence, rights });
const PENDING = (path: string, holder: string, request: string): RegisteredImage => ({
  path: `${P}${path}`,
  licence: 'permission-pending',
  rights: `permission requested from ${holder}`,
  holder,
  request: `docs/rights/permission-requests/${request}`,
});

export const COMPENDIUM_IMAGE_REGISTER: readonly RegisteredImage[] = [
  {
    path: 'apps/game/public/assets/compendium/revolt-1922/beach-illustration.png',
    licence: 'public-domain',
    rights: "project owner's determination, 2026-11-06",
  },
  {
    path: 'apps/game/public/assets/compendium/revolt-1922/hero-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/forte-copacabana/hero-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/forte-copacabana/gate-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/forte-copacabana/fort-plan.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/isidoro-dias-lopes/portrait.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/luis-carlos-prestes/portrait-1922.png',
    licence: 'public-domain',
    rights: "project owner's determination, 2026-11-06",
  },
  {
    path: 'apps/game/public/assets/compendium/luis-carlos-prestes/column-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/sao-paulo-1924/hero-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/map-fazenda/hero-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/map-fazenda/map.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/foz-do-iguacu/hero-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/foz-do-iguacu/group-photo.png',
    licence: 'public-domain',
    rights: 'Wikimedia Commons',
  },
  {
    path: 'apps/game/public/assets/compendium/miguel-costa/portrait.png',
    licence: 'public-domain',
    rights: "project owner's determination, 2026-11-06",
  },
  // complete-books-and-bibliography 4.1 (owner, 2026-11-15).
  PD('rs-revolt-1924/hero-photo.png', 'Wikimedia Commons; AHMACPS, Santo Ângelo, 1924'),
  PD('porto-mendes/hero-photo.png', 'Wikimedia Commons; Thomaz Luiz Reis, 1924–1925'),
  PD('army-patriotico/hero-photo.png', 'Wikimedia Commons; Thomaz Luiz Reis, 1924–1925'),
  PD('serra-nova-1926/hero-photo.png', 'Wikimedia Commons; O Malho, 25 Sep. 1926'),
  PD('batalhoes-patrioticos-bahia/hero-photo.png', 'Wikimedia Commons; 24 Dec. 1926'),
  PD('exile-1927/hero-photo.png', 'Wikimedia Commons; Careta, 19 Mar. 1927'),
  PD('exile-1927/caricature.png', 'Wikimedia Commons; Careta, 3 Nov. 1928'),
  PD('lourenco-moreira-lima/portrait.png', 'Wikimedia Commons; 1927, weak provenance'),
  FREE('tenentismo/hero-photo.png', 'CC0-1.0', 'Wikimedia Commons, CC0'),
  PD('vila-militar/map.png', 'Wikimedia Commons; 1922 map'),
  PD('revolt-1922/press.png', 'Wikimedia Commons; Gazeta de Notícias, 6 July 1922'),
  PD('army-legalista/hero-photo.png', 'Wikimedia Commons; O Malho, 1924'),
  PD('sao-paulo-retaken-1924/hero-photo.png', 'Wikimedia Commons; Gustavo Prugner, 1924'),
  PD('section-jaguncos/hero-photo.png', 'Wikimedia Commons; c. 1914'),
  PD('la-gaiba/map.png', 'Wikimedia Commons; NASA, modern'),
  FREE('map-serra-rio/verdinho-today.png', 'CC-BY-SA-3.0', 'Wikimedia Commons; Paulo Roberto'),
  FREE('sao-luiz-1924/route-map.png', 'CC-BY-SA-4.0', 'Wikimedia Commons; User:Serraria'),
  FREE('rs-revolt-1924/map.png', 'CC-BY-SA-4.0', 'Wikimedia Commons; User:Serraria'),
  FREE('mauser-7mm/hero-photo.png', 'CC-BY-SA-3.0', 'Wikimedia Commons'),
  PD('siqueira-campos/portrait-1922.png', "project owner's determination, 2026-11-06"),
  PD('army-coluna/hero-photo.png', "project owner's determination, 2026-11-06"),
  // Under a permission request (D3a); docs/rights/permission-requests/.
  PENDING('la-gaiba-1927/monument.png', 'CPDOC/FGV', 'cpdoc-fgv.md'),
  PENDING('la-gaiba-1927/workers.png', 'CPDOC/FGV', 'cpdoc-fgv.md'),
  PENDING('exile-1927/interview.png', 'CPDOC/FGV', 'cpdoc-fgv.md'),
  PENDING('pantanal/route-map-1977.png', 'Biblioteca do Exército', 'bibliex.md'),
  PENDING('army-coluna/portinari.png', 'Projeto Portinari', 'projeto-portinari.md'),
  PENDING('sao-luiz-1924/blanc-map.png', 'Duke University Press', 'duke-maps.md'),
  PENDING('serra-nova/blanc-map.png', 'Duke University Press', 'duke-maps.md'),
  PENDING('o-libertador-1924/front-page.png', 'Fundação Biblioteca Nacional', 'biblioteca-nacional.md'),
];

/** Images of entries without doc meta, or added to it (complete-books-and-bibliography 4.1). */
export const ENTRY_IMAGES: Readonly<Record<string, readonly ImageRef[]>> = {
  'rs-revolt-1924': [
    { slot: 'hero-photo', path: `${A}rs-revolt-1924/hero-photo.png` },
    { slot: 'map', path: `${A}rs-revolt-1924/map.png` },
  ],
  'porto-mendes': [{ slot: 'hero-photo', path: `${A}porto-mendes/hero-photo.png` }],
  'army-patriotico': [{ slot: 'hero-photo', path: `${A}army-patriotico/hero-photo.png` }],
  'serra-nova-1926': [{ slot: 'hero-photo', path: `${A}serra-nova-1926/hero-photo.png` }],
  'batalhoes-patrioticos-bahia': [{ slot: 'hero-photo', path: `${A}batalhoes-patrioticos-bahia/hero-photo.png` }],
  'exile-1927': [
    { slot: 'hero-photo', path: `${A}exile-1927/hero-photo.png` },
    { slot: 'interview', path: `${P}exile-1927/interview.png` },
    { slot: 'caricature', path: `${A}exile-1927/caricature.png` },
  ],
  'lourenco-moreira-lima': [{ slot: 'portrait', path: `${A}lourenco-moreira-lima/portrait.png` }],
  tenentismo: [{ slot: 'hero-photo', path: `${A}tenentismo/hero-photo.png` }],
  'vila-militar': [{ slot: 'map', path: `${A}vila-militar/map.png` }],
  'revolt-1922': [{ slot: 'press', path: `${A}revolt-1922/press.png` }],
  'army-legalista': [{ slot: 'hero-photo', path: `${A}army-legalista/hero-photo.png` }],
  'sao-paulo-retaken-1924': [{ slot: 'hero-photo', path: `${A}sao-paulo-retaken-1924/hero-photo.png` }],
  'section-jaguncos': [{ slot: 'hero-photo', path: `${A}section-jaguncos/hero-photo.png` }],
  'la-gaiba': [{ slot: 'map', path: `${A}la-gaiba/map.png` }],
  'map-serra-rio': [{ slot: 'verdinho-today', path: `${A}map-serra-rio/verdinho-today.png` }],
  'sao-luiz-1924': [
    { slot: 'route-map', path: `${A}sao-luiz-1924/route-map.png` },
    { slot: 'blanc-map', path: `${P}sao-luiz-1924/blanc-map.png` },
  ],
  'mauser-7mm': [{ slot: 'hero-photo', path: `${A}mauser-7mm/hero-photo.png` }],
  'siqueira-campos': [{ slot: 'portrait-1922', path: `${A}siqueira-campos/portrait-1922.png` }],
  'army-coluna': [
    { slot: 'hero-photo', path: `${A}army-coluna/hero-photo.png` },
    { slot: 'portinari', path: `${P}army-coluna/portinari.png` },
  ],
  'la-gaiba-1927': [
    { slot: 'monument', path: `${P}la-gaiba-1927/monument.png` },
    { slot: 'workers', path: `${P}la-gaiba-1927/workers.png` },
  ],
  pantanal: [{ slot: 'route-map-1977', path: `${P}pantanal/route-map-1977.png` }],
  'serra-nova': [{ slot: 'blanc-map', path: `${P}serra-nova/blanc-map.png` }],
  'o-libertador-1924': [{ slot: 'front-page', path: `${P}o-libertador-1924/front-page.png` }],
};

export interface ImageRef {
  /** Slot name; the caption and credit are keyed by entry id and slot. */
  slot: string;
  /** Path from the repository root, as in docs/assets.md. */
  path: string;
}

export interface DocEntryMeta {
  label: ContentLabel;
  confidence: 'high' | 'medium' | 'low';
  sourceRefs: readonly string[];
  images?: readonly ImageRef[];
}

export const DOC_ENTRY_META: Readonly<Record<string, DocEntryMeta>> = {
  'forte-copacabana': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'helio-1922'],
    images: [
      {
        slot: 'hero-photo',
        path: 'apps/game/public/assets/compendium/forte-copacabana/hero-photo.png',
      },
      {
        slot: 'fort-plan',
        path: 'apps/game/public/assets/compendium/forte-copacabana/fort-plan.png',
      },
      {
        slot: 'gate-photo',
        path: 'apps/game/public/assets/compendium/forte-copacabana/gate-photo.png',
      },
    ],
  },
  'foz-do-iguacu': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'blanc-2024'],
    images: [
      {
        slot: 'hero-photo',
        path: 'apps/game/public/assets/compendium/foz-do-iguacu/hero-photo.png',
      },
      {
        slot: 'group-photo',
        path: 'apps/game/public/assets/compendium/foz-do-iguacu/group-photo.png',
      },
    ],
  },
  'isidoro-dias-lopes': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2022', 'meirelles-1995'],
    images: [
      {
        slot: 'portrait',
        path: 'apps/game/public/assets/compendium/isidoro-dias-lopes/portrait.png',
      },
    ],
  },
  'la-gaiba': {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['blanc-2024', 'anita-1991', 'cpdoc-coluna'],
  },
  'luis-carlos-prestes': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'amado-1942', 'anita-1991', 'cpdoc-prestes', 'historiafm-2024'],
    images: [
      {
        slot: 'portrait-1922',
        path: 'apps/game/public/assets/compendium/luis-carlos-prestes/portrait-1922.png',
      },
      {
        slot: 'column-photo',
        path: 'apps/game/public/assets/compendium/luis-carlos-prestes/column-photo.png',
      },
    ],
  },
  'map-fazenda': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2022'],
    images: [
      { slot: 'hero-photo', path: 'apps/game/public/assets/compendium/map-fazenda/hero-photo.png' },
      { slot: 'map', path: 'apps/game/public/assets/compendium/map-fazenda/map.png' },
    ],
  },
  'map-serra-rio': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'teles-2008', 'blanc-2024'],
  },
  'mauser-7mm': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974'],
  },
  'miguel-costa': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'blanc-2024', 'meirelles-1995'],
    images: [
      { slot: 'portrait', path: 'apps/game/public/assets/compendium/miguel-costa/portrait.png' },
    ],
  },
  pantanal: {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'anita-1991'],
  },
  'porto-mendes': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'blanc-2024'],
  },
  'ramada-1925': {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['macaulay-1974', 'vitor-2011', 'tavora-1928', 'revolucao-cultural-2025'],
  },
  'revolt-1922': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'helio-1922'],
    images: [
      { slot: 'hero-photo', path: 'apps/game/public/assets/compendium/revolt-1922/hero-photo.png' },
      {
        slot: 'beach-illustration',
        path: 'apps/game/public/assets/compendium/revolt-1922/beach-illustration.png',
      },
    ],
  },
  'rs-revolt-1924': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'vitor-2011', 'tavora-1928'],
  },
  'sao-luiz-1924': {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'blanc-2024'],
  },
  'sao-luiz-gonzaga': {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['vitor-2011', 'macaulay-1974', 'blanc-2024'],
  },
  'sao-paulo-1924': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'castro-2022', 'blanc-2024', 'cohen-2007'],
    images: [
      {
        slot: 'hero-photo',
        path: 'apps/game/public/assets/compendium/sao-paulo-1924/hero-photo.png',
      },
    ],
  },
  'serra-nova': {
    label: 'historical',
    confidence: 'medium',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'anita-1991', 'nascimento-2026', 'almg-2026', 'mozzer-2009'],
  },
  'siqueira-campos': {
    label: 'historical',
    confidence: 'high',
    sourceRefs: ['macaulay-1974', 'helio-1922', 'castro-2022'],
  },
  // enrich-texts-from-sources 3.2-3.3, approved by the owner on 2026-11-12.
  'positivismo-militar': { label: 'historical', confidence: 'high', sourceRefs: ['macaulay-1974', 'historiafm-2024'] },
  'tenentismo': { label: 'historical', confidence: 'high', sourceRefs: ['macaulay-1974', 'historiafm-2024', 'anita-1991'] },
  'o-libertador-1924': { label: 'historical', confidence: 'medium', sourceRefs: ['libertador-1924', 'macaulay-1974', 'anita-1991', 'historiafm-2024'] },
  'manifesto-porto-nacional-1925': { label: 'historical', confidence: 'high', sourceRefs: ['manifesto-1925', 'macaulay-1974'] },
  'coluna-no-grande-sertao': { label: 'dramatized', confidence: 'low', sourceRefs: ['mozzer-2009', 'rosa-1956'] },
  'porto-nacional': { label: 'historical', confidence: 'high', sourceRefs: ['macaulay-1974', 'manifesto-1925'] },
  'lourenco-moreira-lima': { label: 'historical', confidence: 'medium', sourceRefs: ['macaulay-1974', 'lima-1931', 'mozzer-2009'] },
  'batalhoes-patrioticos-bahia': { label: 'historical', confidence: 'medium', sourceRefs: ['macaulay-1974', 'anita-1991', 'mozzer-2009'] },
  'vivandeiras': { label: 'historical', confidence: 'medium', sourceRefs: ['macaulay-1974', 'historiafm-2024', 'mozzer-2009', 'carvalho-2001'] },
  'army-coluna': { label: 'historical', confidence: 'high', sourceRefs: ['macaulay-1974', 'historiafm-2024', 'mozzer-2009', 'blanc-2024'] },
};
