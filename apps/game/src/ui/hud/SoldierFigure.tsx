import { coverBand, type UnitSnapshot } from '@prestes/shared';
import type { ReactElement } from 'react';

/**
 * redo-battle-hud (owner, 2026-11-12: "vc nao fez os desenho no resumo da
 * tropa"): one small pixel soldier per man, as the owner asked on
 * 2026-11-11 — the helmet coloured by his cover, the body by his health,
 * and under him a five-round clip that empties with his ammunition. A
 * wounded man carries a bandage, a pinned or routed man a mark over his
 * head, and a man who is down lies flat and grey, so no state is told by
 * colour alone. Drawn as an SVG on a 14 x 18 art-pixel grid.
 */
export type CoverClass = 'none' | 'light' | 'good' | 'inside';
export type HealthClass = 'fit' | 'wounded' | 'badly' | 'down' | 'dead';

/** Cover the soldier has (unit cover is 0..1); a man inside a position counts as inside. */
export function coverClassOf(unit: UnitSnapshot): CoverClass {
  if (unit.garrison !== undefined) return 'inside';
  // troop-thumbnails-and-panel 3.3: the shared bands, the simulation's own line for "in cover".
  return coverBand(unit.cover);
}

export function healthClassOf(unit: UnitSnapshot): HealthClass {
  if (!unit.alive) return 'dead';
  if (unit.incapacitated) return 'down';
  if (unit.wound === 'severe' || unit.wound === 'fatal' || unit.hp < 35) return 'badly';
  if (unit.wound !== 'none' || unit.hp < 70) return 'wounded';
  return 'fit';
}

export const HELMET_COLOURS: Record<CoverClass, string> = {
  none: '#a39a86',
  light: '#d9b23c',
  good: '#4f8f36',
  inside: '#3f74b8',
};

const BODY_COLOURS: Record<HealthClass, { main: string; shade: string }> = {
  fit: { main: '#4d7a33', shade: '#365a22' },
  wounded: { main: '#c9a03a', shade: '#9a7826' },
  badly: { main: '#b4442e', shade: '#86301f' },
  down: { main: '#857b70', shade: '#655c53' },
  dead: { main: '#5d554d', shade: '#463f39' },
};

const INK = '#2a1a0e';

/** The bust on a 14 x 17 grid: K outline, H helmet, S/s skin, B/b tunic. */
const BUST = [
  '....KKKKKK....',
  '...KHHHHHHK...',
  '..KHHHHHHHHK..',
  '..KHHHHHHHHK..',
  '.KKKKKKKKKKKK.',
  '..KSSSSSSSSK..',
  '..KSKSSSSKSK..',
  '..KSSSSSSSSK..',
  '...KSSssSSK...',
  '....KKSSKK....',
  '..KKBBBBBBKK..',
  '.KBBBBbbBBBBK.',
  'KBBBBBbbBBBBBK',
  'KBbBBBbbBBBbBK',
  'KBbBBBBBBBBbBK',
  'KbbKBBBBBBKbbK',
  'KKKKKKKKKKKKKK',
];
const SKIN = '#d3a374';
const SKIN_SHADE = '#a87a50';

interface SoldierFigureProps {
  cover: CoverClass;
  health: HealthClass;
  /** Rounds left over a full load, 0..1. */
  ammo: number;
  mark: 'pinned' | 'routed' | null;
  selected: boolean;
  /** troop-thumbnails-and-panel 3.2: the section's leader wears a star. */
  leader?: boolean;
}

const px = (x: number, y: number, w: number, h: number, fill: string, key: string) => (
  <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />
);

export function SoldierFigure({ cover, health, ammo, mark, selected, leader = false }: SoldierFigureProps) {
  const helmet = HELMET_COLOURS[cover];
  const body = BODY_COLOURS[health];
  const lying = health === 'down' || health === 'dead';
  const rounds = ammo <= 0 ? 0 : Math.max(1, Math.round(Math.min(1, ammo) * 5));
  const palette: Record<string, string> = {
    K: INK,
    H: helmet,
    S: SKIN,
    s: SKIN_SHADE,
    B: body.main,
    b: body.shade,
    W: '#f1ead8',
  };
  const wounded = health === 'wounded' || health === 'badly';
  const figure: ReactElement[] = [];
  BUST.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      let code = row[x]!;
      if (wounded && (y === 5 || (y >= 12 && y <= 13 && x >= 2 && x <= 3)) && code !== 'K' && code !== '.') code = 'W';
      const fill = palette[code];
      if (fill) figure.push(px(x, y, 1, 1, fill, `${x}:${y}`));
    }
  });
  // A glint on the helmet.
  figure.push(<rect key="glint" x={5} y={2} width={2} height={1} fill="#ffffff" opacity={0.35} />);
  return (
    <svg
      className={`soldier-figure${selected ? ' selected' : ''}`}
      viewBox="0 0 14 24"
      width={28}
      height={48}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g transform={lying ? 'translate(0 16) rotate(-90) translate(1 1) scale(0.8)' : undefined} opacity={health === 'dead' ? 0.55 : 1}>
        {figure}
      </g>
      {health === 'dead' ? <path d="M4 2 L10 8 M10 2 L4 8" stroke="#3a2a1a" strokeWidth={1} /> : null}
      {leader ? (
        <path d="M1.5 0 L2.1 1.2 L3.4 1.3 L2.4 2.1 L2.8 3.4 L1.5 2.7 L0.2 3.4 L0.6 2.1 L-0.4 1.3 L0.9 1.2 Z" transform="translate(0.5 0.15) scale(1.3)" fill="#e2b54a" stroke={INK} strokeWidth={0.3} data-mark="leader" />
      ) : null}
      {mark === 'pinned' ? (
        <path d="M5 0 L9 0 L7 2 Z" fill="#e8743b" stroke={INK} strokeWidth={0.4} data-mark="pinned" />
      ) : null}
      {mark === 'routed' ? <path d="M11 0 L11 5 M11 0 L14 1 L11 2" stroke="#f1ead8" strokeWidth={0.8} data-mark="routed" /> : null}
      {/* The clip: five cartridges on a strip, brass when full, empty slots dark. */}
      <rect x={1} y={18} width={12} height={5} fill={INK} />
      {Array.from({ length: 5 }, (_, index) => (
        <g key={index}>
          <rect x={2 + index * 2.2} y={19} width={1.6} height={3} fill={index < rounds ? '#e2b54a' : '#4a3a2a'} />
          {index < rounds ? <rect x={2 + index * 2.2} y={19} width={1.6} height={1} fill="#b0642c" /> : null}
        </g>
      ))}
      {selected ? <rect x={1} y={23.2} width={12} height={0.8} fill="#2a1a0e" data-mark="selected" /> : null}
      {rounds === 0 ? <path d="M2 19 L12 22 M12 19 L2 22" stroke="#e8743b" strokeWidth={0.8} data-mark="empty" /> : null}
    </svg>
  );
}
