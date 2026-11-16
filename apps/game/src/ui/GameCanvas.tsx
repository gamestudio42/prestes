import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { type CommanderBalloon,
  SceneView,
  type CameraBand,
  type OrderCallout,
  type TrainingMarker,
  type SlotBadge,
} from '@prestes/view3d';
import { activeMapRuntime, dragSpacing, type PreviewPlan, type ProtectionClass, type SlotMarker, type Vec2 } from '@prestes/shared';
import { translate, type Locale } from '@prestes/content';
import type { GameClient } from '../client/GameClient';
import { loadGraphicsSettings } from '../storage';
import type { AudioListener } from '../audio/ShotAudio';
import { cursorHint, type CursorHint, type QuickDecision, type QuickHit } from '../hooks/quickAction';

export type SelectionMode = 'all' | 'troops';

export type { CursorHint };

export interface GameCanvasProps {
  client: GameClient;
  postStrong: boolean;
  /** Draw the movement routes of orders. */
  routesVisible?: boolean;
  /** Called every frame with what the player hears from (shot audio). */
  onAudioView?: (listener: AudioListener) => void;
  cameraRequest: { band: CameraBand; nonce: number } | null;
  /** The commander's current order, shown in a balloon over the officer. */
  commanderBalloon?: CommanderBalloon | null;
  /** Ground point the camera centres on when it changes (the current station). */
  cameraFocus?: { x: number; y: number; key: string } | null;
  preview: PreviewPlan | null;
  slotMarkers?: readonly (SlotMarker & { protects?: ProtectionClass })[];
  /** add-deployment-phase D5: free/total per cover piece near the cursor. */
  slotBadges?: readonly SlotBadge[];
  aimPending?: boolean;
  pendingAction?: boolean;
  lineMoveArmed?: boolean;
  /** A ground order is armed: dragging from the destination sets the facing. */
  groundOrderArmed?: boolean;
  /** Interface language, for the spacing label's decimal separator. */
  locale?: string;
  trainingField?: boolean;
  strategicField?: boolean;
  trainingMarkers?: readonly TrainingMarker[];
  orderCallout?: OrderCallout | null;
  /** garrison-and-assault 4.1: Sair's 30 m ring, while the order waits for its point. */
  rangeRing?: { x: number; y: number; radius: number } | null;
  /** add-deployment-phase 3.1: draw both deployment areas (the phase is on). */
  deploymentAreas?: boolean;
  targetUnitIds?: readonly number[];
  selectedUnitIds?: readonly number[];
  onCameraAction?: (kind: 'pan' | 'zoom' | 'rotate') => void;
  onBandChange: (band: CameraBand) => void;
  onSelectUnits: (unitIds: number[], mode: SelectionMode) => void;
  onPrimaryUnit: (unitId: number, queue?: boolean) => void;
  /** refine-battle-controls: hands the scene to the app so the HUD can focus it. */
  onSceneReady?: (scene: SceneView | null) => void;
  onPrimaryGround: (point: Vec2, facing?: Vec2, queue?: boolean) => void;
  onQuickUnit: (unitId: number, queue?: boolean) => void;
  onQuickGround: (point: Vec2, facing?: Vec2, queue?: boolean) => void;
  /** hud-icons-and-cursors: a right-click on a building (enter or assault); false falls back to a move. */
  onQuickBuilding?: (buildingId: number, point: Vec2, queue?: boolean) => boolean;
  /** hud-icons-and-cursors: what a right-click would do on a hit, for the cursor. */
  quickAction?: (hit: QuickHit) => QuickDecision | null;
  onPrimaryLine: (from: Vec2, to: Vec2) => void;
  onQuickLine: (from: Vec2, to: Vec2) => void;
  onPreviewLine: (line: { from: Vec2; to: Vec2 } | null) => void;
  onPreviewFacing: (drag: { from: Vec2; to: Vec2 } | null) => void;
  onPreviewGround: (point: Vec2 | null) => void;
  onPreviewUnit: (unitId: number | null) => void;
  /** The right-click action under the pointer (or the armed order's target), shown beside it. */
  onHover: (hint: CursorHint | null, x: number, y: number) => void;
}

interface DragState {
  startX: number;
  startY: number;
  x: number;
  y: number;
  dragging: boolean;
  /** Shift was held at the press: the drag spreads a line instead of facing. */
  shift?: boolean;
}

/** The facing of a drag from `from` to `to` on the ground. */
function dragFacing(from: Vec2, to: Vec2): Vec2 {
  return { x: to.x - from.x, y: to.y - from.y };
}

export function GameCanvas({
  client,
  postStrong,
  routesVisible = true,
  onAudioView,
  cameraRequest,
  cameraFocus = null,
  commanderBalloon = null,
  preview,
  slotMarkers,
  slotBadges,
  aimPending = false,
  pendingAction = false,
  lineMoveArmed = false,
  groundOrderArmed = false,
  locale = 'en',
  trainingField = false,
  strategicField = false,
  trainingMarkers = [],
  orderCallout = null,
  rangeRing = null,
  deploymentAreas = false,
  targetUnitIds = [],
  selectedUnitIds = [],
  onCameraAction,
  onBandChange,
  onSelectUnits,
  onPrimaryUnit,
  onPrimaryGround,
  onQuickUnit,
  onQuickGround,
  onQuickBuilding,
  quickAction,
  onPrimaryLine,
  onQuickLine,
  onSceneReady,
  onPreviewLine,
  onPreviewFacing,
  onPreviewGround,
  onPreviewUnit,
  onHover,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneView | null>(null);
  const onBandChangeRef = useRef(onBandChange);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [rightDrag, setRightDrag] = useState<DragState | null>(null);
  const rightDragRef = useRef<DragState | null>(null);
  // Spacing shown beside the cursor while a facing drag is under way.
  const [spacingLabel, setSpacingLabel] = useState<{ x: number; y: number; metres: number } | null>(null);
  const previewFacing = (drag: { from: Vec2; to: Vec2 } | null, x: number, y: number): void => {
    onPreviewFacing(drag);
    setSpacingLabel(
      drag ? { x, y, metres: dragSpacing(Math.sqrt((drag.to.x - drag.from.x) ** 2 + (drag.to.y - drag.from.y) ** 2)) } : null,
    );
  };
  const clearFacing = (): void => {
    onPreviewFacing(null);
    setSpacingLabel(null);
  };
  onBandChangeRef.current = onBandChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new SceneView({
      container,
      trainingField,
      strategicField,
      // add-battle-maps: the client knows which map its battle runs on.
      battleMap: client?.battleMap,
      onCameraAction,
      onBandChange: (band) => onBandChangeRef.current(band),
      antialias: loadGraphicsSettings().smoothEdges,
    });
    scene.setTrainingMarkers(trainingMarkers);
    sceneRef.current = scene;
    onSceneReady?.(scene);
    scene.setPostStrong(true);
    if (import.meta.env.DEV) {
      // Playwright hovers world points through this dev-only hook.
      (window as unknown as { __prestesScene?: unknown }).__prestesScene = {
        groundToScreen: (x: number, y: number) => scene.groundToScreen(x, y),
        focusOn: (x: number, y: number) => scene.focusOn(x, y),
        view: () => scene.view(),
        // add-map-compass: the camera's yaw and tilt (radians), for the compass checks.
        camera: () => ({ yaw: scene.camera.yaw, tilt: scene.camera.tilt, targetYaw: scene.camera.targetYaw }),
        garrisonMarks: () => scene.garrisonMarks(),
        // add-historical-commander 3.2: the pennant over the map's historical figure.
        figurePennant: () => scene.figurePennantShown(),
    objectiveMarks: () => scene.objectiveMarks(),
        deploymentMarks: () => scene.deploymentMarksShown(),
        deploymentAreas: () => scene.deploymentAreasShown(),
        slotPreview: () => scene.slotPreviewState(),
        // redo-battle-hud D6: what the strategic layers draw.
        mapLayers: () => scene.mapLayersState(),
        rangeRing: () => scene.rangeRingState(),
        setBand: (band: 'tactical' | 'strategic') => scene.setBand(band),
        effects: () => scene.effectsState(),
        clips: (unitId: number) => scene.clipState(unitId),
        weapons: (unitId: number) => scene.weaponState(unitId),
        shown: () => scene.shownUnitIds(),
        smoothEdges: () => scene.smoothEdges(),
        // biome-trees-and-plants 4.1b: crowns faded over the player's men, outlines drawn.
        canopy: () => scene.canopyState(),
        pick: (x: number, y: number) => {
          const screen = scene.groundToScreen(x, y);
          return screen ? scene.pickUnit(screen.x, screen.y) : null;
        },
      };
    }

    let frameHandle = 0;
    const loop = (): void => {
      const frame = client.interpolated();
      if (frame) {
        scene.update(frame);
        if (onAudioView) {
          const units = new Map(frame.units.map((unit) => [unit.id, unit]));
          onAudioView({
            ...scene.view(),
            faction: 'column',
            factionOf: (id) => units.get(id)?.faction,
            weaponOf: (id) => units.get(id)?.weaponId,
            frame,
          });
        }
      }
      frameHandle = requestAnimationFrame(loop);
    };
    frameHandle = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameHandle);
      scene.dispose();
      sceneRef.current = null;
      onSceneReady?.(null);
    };
  }, [client, trainingField, strategicField]);

  useEffect(() => {
    sceneRef.current?.setRangeRing(rangeRing);
  }, [rangeRing]);

  useEffect(() => {
    sceneRef.current?.setTargetUnits(targetUnitIds);
  }, [targetUnitIds]);

  useEffect(() => {
    sceneRef.current?.setSelectedUnits(selectedUnitIds);
  }, [selectedUnitIds]);

  useEffect(() => {
    if (orderCallout) {
      sceneRef.current?.showOrderCallout(orderCallout);
    }
  }, [orderCallout]);

  useEffect(() => {
    sceneRef.current?.setPostStrong(postStrong);
  }, [postStrong]);

  useEffect(() => {
    sceneRef.current?.setRoutesVisible(routesVisible);
  }, [routesVisible, client, trainingField, strategicField]);

  useEffect(() => {
    sceneRef.current?.setPreview(preview);
  }, [preview]);

  useEffect(() => {
    sceneRef.current?.setSlotMarkers(slotMarkers ?? []);
  }, [slotMarkers]);

  const badgeKey = (slotBadges ?? []).map((badge) => `${badge.x}:${badge.y}:${badge.text}`).join('|');
  useEffect(() => {
    sceneRef.current?.setSlotBadges(slotBadges ?? []);
  }, [badgeKey, client]);

  useEffect(() => {
    sceneRef.current?.setTrainingMarkers(trainingMarkers);
  }, [trainingMarkers]);

  useEffect(() => {
    if (cameraRequest) {
      sceneRef.current?.setBand(cameraRequest.band);
    }
  }, [cameraRequest]);

  const balloonKey = commanderBalloon ? `${commanderBalloon.officerId}:${commanderBalloon.text}` : '';
  useEffect(() => {
    sceneRef.current?.setCommanderBalloon(commanderBalloon);
  }, [balloonKey, client]);

  useEffect(() => {
    sceneRef.current?.setDeploymentAreas(deploymentAreas === true);
  }, [deploymentAreas, client]);

  // refine-battle-maps 6.2: the opening deployment marks, labelled in the player's language.
  useEffect(() => {
    if (trainingField) return;
    const language: Locale = locale === 'pt-BR' ? 'pt-BR' : 'en';
    sceneRef.current?.setDeploymentLabels({
      own: translate(language, 'battle.deploymentOwn'),
      enemy: translate(language, 'battle.deploymentEnemy'),
    });
  }, [locale, client, trainingField]);

  const focusKey = cameraFocus?.key ?? null;
  useEffect(() => {
    if (cameraFocus) {
      sceneRef.current?.focusOn(cameraFocus.x, cameraFocus.y);
    }
    // Only a new station (or a new scene) moves the camera.
  }, [focusKey, client]);

  const localPoint = (event: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    if (event.button !== 0 && event.button !== 2) {
      return;
    }
    if (event.button === 2) {
      event.preventDefault();
    }
    const { x, y } = localPoint(event);
    const unitId = scene.pickUnit(x, y);
    if (event.button === 0) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDrag({ startX: x, startY: y, x, y, dragging: false, shift: event.shiftKey });
      return;
    }
    if (unitId !== null) {
      onQuickUnit(unitId, event.shiftKey);
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const nextDrag = { startX: x, startY: y, x, y, dragging: false, shift: event.shiftKey };
    rightDragRef.current = nextDrag;
    setRightDrag(nextDrag);
    onPreviewUnit(null);
  };

  /** hud-icons-and-cursors: the building under the pointer on the battle map, if any. */
  const pickBuildingAt = (scene: SceneView, x: number, y: number): { id: number; point: Vec2 } | null =>
    scene.pickBuilding(x, y, activeMapRuntime()?.map.buildings ?? []);

  // With an order armed, an able soldier of our own under the cursor is not a
  // pick: the click goes to the ground (cover he stands in, for example).
  // Wounded friendlies stay pickable for Rescue.
  // The pick skips them, so the nearest pickable soldier (an enemy, or a
  // casualty for Rescue among his comrades) is found behind them.
  const orderPick = (scene: SceneView, x: number, y: number): number | null =>
    pendingAction || aimPending
      ? scene.pickUnit(x, y, (unit) => unit.faction !== 'column' || unit.incapacitated)
      : scene.pickUnit(x, y);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    const { x, y } = localPoint(event);
    const activeRightDrag = rightDragRef.current ?? rightDrag;
    if (activeRightDrag) {
      if ((event.buttons & 2) === 0) {
        rightDragRef.current = null;
        setRightDrag(null);
        onPreviewLine(null);
        clearFacing();
        return;
      }
      const dragging =
        activeRightDrag.dragging ||
        Math.abs(x - activeRightDrag.startX) > 8 ||
        Math.abs(y - activeRightDrag.startY) > 8;
      const nextDrag = { ...activeRightDrag, x, y, dragging };
      rightDragRef.current = nextDrag;
      setRightDrag(nextDrag);
      if (dragging) {
        const from = scene.screenToGround(activeRightDrag.startX, activeRightDrag.startY);
        const to = scene.screenToGround(x, y);
        if (activeRightDrag.shift) {
          onPreviewLine(from && to ? { from, to } : null);
        } else {
          previewFacing(from && to ? { from, to } : null, x, y);
        }
      }
      return;
    }
    if (drag) {
      const dragging =
        drag.dragging ||
        Math.abs(x - drag.startX) > (groundOrderArmed ? 8 : 5) ||
        Math.abs(y - drag.startY) > (groundOrderArmed ? 8 : 5);
      setDrag({ ...drag, x, y, dragging });
      if (groundOrderArmed && dragging) {
        const from = scene.screenToGround(drag.startX, drag.startY);
        const to = scene.screenToGround(x, y);
        if (drag.shift && lineMoveArmed) {
          onPreviewLine(from && to ? { from, to } : null);
        } else {
          previewFacing(from && to ? { from, to } : null, x, y);
        }
      }
      return;
    }

    const frame = client.currentFrame();
    const unitId = orderPick(scene, x, y);
    const hint = cursorHint;
    if (unitId !== null && frame) {
      const unit = frame.units.find((entry) => entry.id === unitId);
      if (unit && unit.alive) {
        const enemy = unit.faction !== 'column';
        onPreviewUnit(enemy ? unitId : null);
        // An armed order takes its target; otherwise the right-click's action shows.
        const shown = pendingAction || aimPending
          ? enemy ? 'attack' : unit.incapacitated ? 'rescue' : null
          : hint(quickAction?.({ kind: 'unit', faction: unit.faction, incapacitated: unit.incapacitated, garrison: unit.garrison }));
        onHover(shown, event.clientX, event.clientY);
        return;
      }
      onPreviewUnit(null);
      onHover(null, event.clientX, event.clientY);
      return;
    }
    onPreviewUnit(null);
    const point = scene.screenToGround(x, y);
    onPreviewGround(point);
    if (!frame || pendingAction || aimPending) {
      onHover(null, event.clientX, event.clientY);
      return;
    }
    const building = pickBuildingAt(scene, x, y);
    const hit: QuickHit | null = building
      ? { kind: 'building', buildingId: building.id, point: point ?? building.point }
      : point
        ? { kind: 'ground', point }
        : null;
    onHover(hit ? hint(quickAction?.(hit)) : null, event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    const activeRightDrag = rightDragRef.current;
    if (activeRightDrag) {
      if (event.button !== 2) {
        return;
      }
      const from = scene.screenToGround(activeRightDrag.startX, activeRightDrag.startY);
      const to = scene.screenToGround(activeRightDrag.x, activeRightDrag.y);
      if (activeRightDrag.dragging && from && to) {
        if (activeRightDrag.shift) {
          onQuickLine(from, to);
        } else {
          onQuickGround(from, dragFacing(from, to));
        }
      } else if (to) {
        // The same building pick as the cursor's: what it showed is what is sent.
        const building = pickBuildingAt(scene, activeRightDrag.x, activeRightDrag.y);
        if (!building || !onQuickBuilding?.(building.id, to, activeRightDrag.shift)) {
          onQuickGround(to, undefined, activeRightDrag.shift);
        }
      }
      onPreviewLine(null);
      clearFacing();
      rightDragRef.current = null;
      setRightDrag(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return;
    }
    if (!drag) {
      return;
    }
    const { startX, startY, x, y, dragging, shift } = drag;
    if (dragging && groundOrderArmed) {
      const from = scene.screenToGround(startX, startY);
      const to = scene.screenToGround(x, y);
      if (from && to) {
        if (shift && lineMoveArmed) {
          onPrimaryLine(from, to);
        } else {
          onPrimaryGround(from, dragFacing(from, to), shift);
        }
      }
      onPreviewLine(null);
      clearFacing();
    } else if (dragging) {
      const ids = scene.unitsInScreenRect(
        Math.min(startX, x),
        Math.min(startY, y),
        Math.max(startX, x),
        Math.max(startY, y),
      );
      onSelectUnits(ids, x < startX ? 'all' : 'troops');
    } else {
      const unitId = orderPick(scene, x, y);
      if (unitId !== null) {
        onPrimaryUnit(unitId, shift);
      } else if (pendingAction || aimPending) {
        const point = scene.screenToGround(x, y);
        if (point) {
          onPrimaryGround(point, undefined, shift);
        }
      }
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDrag(null);
  };
  const selection = drag?.dragging && !groundOrderArmed
    ? {
        left: Math.min(drag.startX, drag.x),
        top: Math.min(drag.startY, drag.y),
        width: Math.abs(drag.x - drag.startX),
        height: Math.abs(drag.y - drag.startY),
        mode: drag.x < drag.startX ? 'all' : 'troops',
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="game-canvas"
      data-testid="game-canvas"
      data-preview={preview?.paths.length ?? 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        rightDragRef.current = null;
        setRightDrag(null);
        setDrag(null);
        onPreviewLine(null);
        clearFacing();
      }}
      onPointerLeave={() => {
        if ((rightDragRef.current?.dragging ?? false) === false) {
          onHover(null, 0, 0);
          onPreviewLine(null);
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {spacingLabel ? (
        <div
          className="drag-spacing"
          data-testid="drag-spacing"
          style={{ left: spacingLabel.x + 14, top: spacingLabel.y + 14 }}
        >
          {`${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(spacingLabel.metres)} m`}
        </div>
      ) : null}
      {selection ? (
        <div
          className={`selection-box ${selection.mode}`}
          style={{
            left: selection.left,
            top: selection.top,
            width: selection.width,
            height: selection.height,
          }}
        />
      ) : null}
    </div>
  );
}



























