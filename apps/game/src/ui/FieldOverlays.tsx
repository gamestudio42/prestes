import { Crosshair, Shield } from 'lucide-react';
import { translate, type Locale } from '@prestes/content';
import type { PlacementPreview } from '@prestes/view3d';

interface FieldOverlaysProps {
  locale: Locale;
  needsTarget: boolean;
  hoverUnitId: number | null;
  cursor: { x: number; y: number } | null;
  placementPreview: PlacementPreview | null;
  hoverHint: { kind: 'cover' | 'target'; x: number; y: number } | null;
}

/** Cursor-following overlays: target reticle, placement status and cover/target hint. */
export function FieldOverlays({
  locale,
  needsTarget,
  hoverUnitId,
  cursor,
  placementPreview,
  hoverHint,
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
    {placementPreview ? (
      <div
        className={`placement-status ${placementPreview.valid ? 'valid' : 'invalid'}`}
        data-testid="placement-status"
      >
        {translate(locale, placementPreview.valid ? 'hud.placementValid' : 'hud.placementInvalid')}
        {' Â· '}{Math.round((placementPreview.rotation * 180) / Math.PI) % 360}Â°
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
        ) : (
          <Crosshair aria-hidden="true" size={16} />
        )}
      </div>
    ) : null}
    </>
  );
}
