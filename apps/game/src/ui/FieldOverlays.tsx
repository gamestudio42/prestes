import { Crosshair, CoverIcon as Shield } from './icons';
import { translate, type Locale } from '@prestes/content';
import type { CoverSlotView } from '@prestes/shared';
import type { CursorHint } from '../hooks/quickAction';
import { CURSOR_ICONS, CURSOR_LABELS } from './hud/orderMeta';

interface FieldOverlaysProps {
  locale: Locale;
  needsTarget: boolean;
  hoverUnitId: number | null;
  cursor: { x: number; y: number } | null;
  hoverHint: { kind: CursorHint; x: number; y: number } | null;
  slotView?: CoverSlotView | null;
}

/** A right-click goes into the building: the cover slots round its walls are not the point. */
const BUILDING_HINTS: ReadonlySet<CursorHint> = new Set(['enter', 'assault', 'assault-far']);

/** Cursor-following overlays: target reticle, free slots and the right-click action badge. */
export function FieldOverlays({
  locale,
  needsTarget,
  hoverUnitId,
  cursor,
  hoverHint,
  slotView = null,
}: FieldOverlaysProps) {
  return (
    <>
    {needsTarget && !hoverUnitId && cursor ? (
      <div
        className="target-reticle"
        style={{ left: cursor.x, top: cursor.y }}
        data-testid="target-reticle"
      >
        <Crosshair aria-hidden="true" size={22} />
        <span>{translate(locale, 'hud.needsTarget')}</span>
      </div>
    ) : null}
    {slotView && slotView.total > 0 && cursor && !BUILDING_HINTS.has(hoverHint?.kind ?? 'move') ? (
      <div
        className="slot-count"
        style={{ left: cursor.x, top: cursor.y }}
        data-testid="slot-count"
        data-free={slotView.free}
        data-total={slotView.total}
        data-planned={slotView.markers.filter((marker) => marker.state === 'planned').length}
      >
        <Shield aria-hidden="true" size={14} />
        <span>{translate(locale, 'hud.slotsFree', { free: slotView.free, total: slotView.total })}</span>
      </div>
    ) : null}
    {hoverHint ? <CursorBadge locale={locale} hint={hoverHint} /> : null}
    </>
  );
}

/** hud-icons-and-cursors: what a right-click does here, its icon and its name, beside the pointer. */
function CursorBadge({ locale, hint }: { locale: Locale; hint: { kind: CursorHint; x: number; y: number } }) {
  const Icon = CURSOR_ICONS[hint.kind];
  return (
    <div
      // Near the right edge the badge sits left of the pointer, off the orders panel.
      className={`cursor-hint ${hint.kind}${hint.x > window.innerWidth - 240 ? ' flip' : ''}`}
      style={{ left: hint.x, top: hint.y }}
      data-testid="cursor-hint"
      data-action={hint.kind}
    >
      <span className="cursor-hint-icon">
        <Icon aria-hidden="true" size={32} />
      </span>
      <span className="cursor-hint-label">{translate(locale, CURSOR_LABELS[hint.kind])}</span>
    </div>
  );
}
