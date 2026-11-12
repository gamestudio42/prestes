import { Crosshair, CoverIcon as Shield, Health } from './icons';
import { translate, type Locale } from '@prestes/content';
import type { CoverSlotView } from '@prestes/shared';

interface FieldOverlaysProps {
  locale: Locale;
  needsTarget: boolean;
  hoverUnitId: number | null;
  cursor: { x: number; y: number } | null;
  hoverHint: { kind: 'cover' | 'target' | 'rescue'; x: number; y: number } | null;
  slotView?: CoverSlotView | null;
}

/** Cursor-following overlays: target reticle, free slots and cover/target hint. */
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
    {slotView && slotView.total > 0 && cursor ? (
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
    {hoverHint ? (
      <div
        className={`cursor-hint ${hoverHint.kind}`}
        style={{ left: hoverHint.x, top: hoverHint.y }}
        data-testid="cursor-hint"
      >
        {hoverHint.kind === 'cover' ? (
          <Shield aria-hidden="true" size={16} />
        ) : hoverHint.kind === 'rescue' ? (
          <Health aria-hidden="true" size={16} />
        ) : (
          <Crosshair aria-hidden="true" size={16} />
        )}
      </div>
    ) : null}
    </>
  );
}
