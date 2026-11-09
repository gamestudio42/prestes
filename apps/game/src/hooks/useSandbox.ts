import { useEffect, useMemo, useState } from 'react';
import {
  MAP_BOUNDS,
  isPointBlockedByCovers,
  normaliseRotation,
  rotateOffset,
  SECTION_TYPES,
  troopFormationOffsets,
  type SectionTypeId,
  type Frame,
  type Vec2,
} from '@prestes/shared';
import type { PlacementPreview } from '@prestes/view3d';
import type { SandboxTool } from '../ui/SandboxPanel';

/** Sandbox panel state, the placement tool with Z/X rotation and its preview. */
export function useSandbox(frame: Frame | null) {
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxTool, setSandboxTool] = useState<SandboxTool | null>(null);
  const [placementPoint, setPlacementPoint] = useState<Vec2 | null>(null);
  const [placementRotation, setPlacementRotation] = useState(0);
  const [controlBothSides, setControlBothSides] = useState(false);
  /** pre-battle-roster 5.3: the section type a placed troop is made of; null is the plain troop. */
  const [troopSection, setTroopSection] = useState<SectionTypeId | null>(null);

  useEffect(() => {
    setPlacementPoint(null);
    setPlacementRotation(0);
  }, [sandboxTool]);

  useEffect(() => {
    if (!sandboxTool) {
      return;
    }
    const held = { z: false, x: false };
    let frame = 0;
    let last = performance.now();
    const speed = Math.PI / 2;
    const onDown = (event: KeyboardEvent): void => {
      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        held.z = true;
      }
      if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        held.x = true;
      }
    };
    const onUp = (event: KeyboardEvent): void => {
      if (event.key === 'z' || event.key === 'Z') {
        held.z = false;
      }
      if (event.key === 'x' || event.key === 'X') {
        held.x = false;
      }
    };
    const onBlur = (): void => {
      held.z = false;
      held.x = false;
    };
    const tick = (time: number): void => {
      const delta = Math.min(0.1, (time - last) / 1000);
      last = time;
      const direction = (held.x ? 1 : 0) - (held.z ? 1 : 0);
      if (direction !== 0) {
        setPlacementRotation((rotation) =>
          normaliseRotation(rotation + direction * speed * delta),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [sandboxTool]);

  const placementPreview = useMemo<PlacementPreview | null>(() => {
    if (!sandboxTool || !placementPoint) {
      return null;
    }
    const rotation = placementRotation;
    const positions: Vec2[] = [];
    if (sandboxTool === 'enemy-troop' || sandboxTool === 'command-troop') {
      const count = troopSection ? SECTION_TYPES[troopSection].men.length : sandboxTool === 'enemy-troop' ? 11 : 3;
      const columns = troopSection || sandboxTool === 'enemy-troop' ? 6 : 3;
      for (const offset of troopFormationOffsets(count, columns, 2.4, rotation)) {
        positions.push({
          x: placementPoint.x + offset.x,
          y: placementPoint.y + offset.y,
        });
      }
    } else if (sandboxTool === 'dummy') {
      positions.push(placementPoint);
    } else {
      const half =
        sandboxTool === 'stone'
          ? { width: 1.8, depth: 0.5 }
          : sandboxTool === 'trench'
            ? { width: 2.4, depth: 1.2 }
            : { width: 1.7, depth: 0.4 };
      for (const local of [
        { x: 0, y: 0 },
        { x: -half.width, y: -half.depth },
        { x: half.width, y: -half.depth },
        { x: half.width, y: half.depth },
        { x: -half.width, y: half.depth },
      ]) {
        const offset = rotateOffset(local, rotation);
        positions.push({
          x: placementPoint.x + offset.x,
          y: placementPoint.y + offset.y,
        });
      }
    }
    const covers = frame?.covers ?? [];
    const units = frame?.units ?? [];
    const valid = positions.every(
      (point) =>
        point.x >= MAP_BOUNDS.minX &&
        point.x <= MAP_BOUNDS.maxX &&
        point.y >= MAP_BOUNDS.minY &&
        point.y <= MAP_BOUNDS.maxY &&
        !isPointBlockedByCovers(point.x, point.y, covers, 0.8) &&
        units.every(
          (unit) =>
            !unit.alive ||
            (unit.x - point.x) ** 2 + (unit.y - point.y) ** 2 > 1.2 * 1.2,
        ),
    );
    return {
      kind: sandboxTool,
      x: placementPoint.x,
      y: placementPoint.y,
      rotation: placementRotation,
      valid,
    };
  }, [sandboxTool, troopSection, placementPoint, placementRotation, frame?.covers, frame?.units]);

  return {
    sandboxOpen,
    setSandboxOpen,
    sandboxTool,
    setSandboxTool,
    placementPoint,
    setPlacementPoint,
    placementRotation,
    controlBothSides,
    setControlBothSides,
    placementPreview,
    troopSection,
    setTroopSection,
  };
}
