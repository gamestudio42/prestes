/**
 * Imported from docs/campaign/compendium/entries (polish-menu-desk, design D12).
 * The docs are the authoring source: edit an entry there and here together.
 */
import type { ContentLabel } from './figures';

/** A compendium image, mirrored from the compendium rows of docs/assets.md. */
export interface RegisteredImage {
  path: string;
  licence: 'public-domain';
  rights: string;
}

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
];

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
