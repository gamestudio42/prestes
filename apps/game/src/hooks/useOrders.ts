import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { ORDER_CATALOG, translate, type Locale, type MessageKey } from '@prestes/content';
import {
  nearestTargetGroups,
  spreadTargetGroups,
  planOrderPreview,
  planQueuedRoutes,
  framedAt,
  dragSpacing,
  coverAtPoint,
  coverSlotView,
  planCoverSlots,
  averageAim,
  averageFacing,
  nearestKnownEnemyAt,
  type CoverSlotView,
  type FireControl,
  type FogExtras,
  type FormationKind,
  type Frame,
  type Posture,
  type PreviewPlan,
  type Stance,
  type TacticalOrder,
  type Vec2,
} from '@prestes/shared';
import { previewKey } from './previewKey';
import { pickSuspectedContact } from './suspectedContact';
import { battleMap as mapById, deploymentSlotView, positionNear, positionsFor, type BattleMapId, type DeploymentSlotView, type PositionDef } from '@prestes/shared';
import type { OrderCallout } from '@prestes/view3d';
import type { GameClient } from '../client/GameClient';
import type { SelectionMode } from '../ui/GameCanvas';
import type { OrderMode } from '../ui/Hud';

interface OrderOptions {
  frame: Frame | null;
  locale: Locale;
  clientRef: MutableRefObject<GameClient | null>;
  hudHidden: boolean;
  controlBothSides: boolean;
}

/**
 * The facing and spacing a drag adds to a ground order: the direction turns
 * the section, the length sets the spacing from close to open order.
 */
function dragOrder(facing: Vec2 | undefined): { facing?: Vec2; spacing?: number } {
  if (!facing) return {};
  return { facing, spacing: dragSpacing(Math.sqrt(facing.x * facing.x + facing.y * facing.y)) };
}

/** Selection, pending orders, previews, officer callouts and every order handler. */
/** add-difficulty-levels 5.2: the commander's line for each fire control setting. */
const FIRE_CONTROL_CALLOUT: Record<FireControl, MessageKey> = {
  free: 'hud.calloutFire',
  economy: 'hud.calloutFireEconomy',
  contact: 'hud.calloutFireContact',
  hold: 'hud.calloutHoldFire',
};

/** The section's answer where it has its own words (the others repeat the order). */
const FIRE_CONTROL_ANSWER: Partial<Record<FireControl, MessageKey>> = {
  economy: 'hud.calloutFireEconomyAnswer',
  contact: 'hud.calloutFireContactAnswer',
};

export function useOrders({
  frame,
  locale,
  clientRef,
  hudHidden,
  controlBothSides,
}: OrderOptions) {
  const [selectedSquadId, setSelectedSquadId] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [pendingOrder, setPendingOrder] = useState<OrderMode | null>(null);
  const [pendingTactical, setPendingTactical] = useState<TacticalOrder | null>(null);
  const [aimPending, setAimPending] = useState(false);
  // refine-battle-controls: Shift pressed on the board arms the next click to queue.
  const [queueNext, setQueueNext] = useState(false);
  // route-around-wire: Shift held, so the next order queues and previews from the queue's end.
  const [shiftHeld, setShiftHeld] = useState(false);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setShiftHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setShiftHeld(false);
    };
    const blur = () => setShiftHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  const [lineDrag, setLineDrag] = useState<{ from: Vec2; to: Vec2 } | null>(null);
  const [facingDrag, setFacingDrag] = useState<{ from: Vec2; to: Vec2 } | null>(null);
  const lastBoundPhase = useRef<string | null>(null);
  const [orderCallout, setOrderCallout] = useState<OrderCallout | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [hoverUnitId, setHoverUnitId] = useState<number | null>(null);
  const [targetUnitIds, setTargetUnitIds] = useState<number[]>([]);

  const selectedUnits =
    frame?.units.filter(
      (unit) =>
        selectedUnitIds.includes(unit.id) &&
        unit.alive &&
        !unit.routed &&
        !unit.dummy,
    ) ?? [];
  const selectedIds = selectedUnits.map((unit) => unit.id);
  const holdFire = selectedUnits.length > 0 && selectedUnits.every((unit) => unit.holdFire === true);
  const fireControl: FireControl =
    selectedUnits[0]?.fireControl ?? (holdFire ? 'hold' : 'free');
  /** add-run-toggle: the selection's pace is Run when every selected soldier hurries. */
  const hurry = selectedUnits.length > 0 && selectedUnits.every((unit) => unit.hurry === true);
  const posture = selectedUnits[0]?.posture ?? 'balanced';
  // garrison-and-assault 4.1: Ocupar, Sair and Assaltar have no path preview.
  const positionOrder = pendingTactical === 'enter' || pendingTactical === 'exit' || pendingTactical === 'assault';
  // scrub-concealment-and-area-fire: Area fire has no path preview either.
  const previewOrder = positionOrder || pendingOrder === 'area-fire'
    ? null
    : (pendingTactical ?? pendingOrder ?? (aimPending ? 'aim' : facingDrag || lineDrag ? 'move' : null));
  const needsTarget =
    pendingOrder === 'attack' ||
    pendingOrder === 'suppress' ||
    pendingOrder === 'flank' ||
    pendingTactical === 'pursue' ||
    pendingTactical === 'rescue';
  // Recomputed only when what it depends on changes, not on every frame
  // (movement-polish: a still pointer over a running battle cost a preview a frame).
  // add-deployment-phase 3.2: in deployment a move or defend order on the cursor always previews.
  const deploying = frame?.phase === 'deployment';
  const deploymentPreview = deploying && (previewOrder === 'move' || previewOrder === 'defend');
  const previewActive = Boolean(
    (previewEnabled || deploymentPreview) && !hudHidden && frame && previewOrder && (!needsTarget || hoverUnitId !== null),
  );
  const latestFrame = useRef(frame);
  latestFrame.current = frame;
  // route-around-wire: the routes of the orders the selected section queued
  // with Shift, each from where the one before ends. Recomputed when the
  // queue, the selection or where its current orders end change.
  const queuedKey = frame
    ? JSON.stringify([
        selectedIds,
        (frame.queuedOrders ?? []).filter((entry) => selectedUnits.some((unit) => unit.squadId === entry.squadId)),
        selectedIds.map((id) => {
          const end = frame.orders.find((order) => order.unitIds.includes(id))?.points.at(-1);
          return end ? `${Math.round(end.x)},${Math.round(end.y)}` : '';
        }),
      ])
    : '';
  const queued = useMemo(
    () => (latestFrame.current && selectedIds.length > 0 ? planQueuedRoutes(latestFrame.current, selectedIds) : null),
    [queuedKey],
  );
  // While Shift is held (or the order was armed with Shift), the order will
  // queue: its preview starts where the section's current and queued orders end.
  const queueing = shiftHeld || queueNext;
  const planKey = previewActive
    ? previewKey({
        order: `${previewOrder!}${queueing ? '+queue' : ''}`,
        selected: selectedUnits,
        hoverPoint,
        hoverUnitId,
        formation: selectedUnits[0]?.formation,
        drag: facingDrag ?? lineDrag,
        dragKind: facingDrag ? 'facing' : lineDrag ? 'line' : null,
      })
    : null;
  const previewPlan: PreviewPlan | null = useMemo(() => {
    const current = latestFrame.current;
    const frame = current && queueing && queued ? framedAt(current, queued.ends) : current;
    return planKey !== null && frame && previewOrder
      ? planOrderPreview({
          frame,
          unitIds: selectedIds,
          order: previewOrder,
          formation: selectedUnits[0]?.formation,
          to: facingDrag
            ? facingDrag.from
            : lineDrag
            ? {
                x: (lineDrag.from.x + lineDrag.to.x) / 2,
                y: (lineDrag.from.y + lineDrag.to.y) / 2,
              }
            : hoverPoint ?? undefined,
          targetId: hoverUnitId ?? undefined,
          line: previewOrder === 'move' ? lineDrag ?? undefined : undefined,
          facing: facingDrag
            ? { x: facingDrag.to.x - facingDrag.from.x, y: facingDrag.to.y - facingDrag.from.y }
            : undefined,
          spacing: facingDrag
            ? dragSpacing(Math.sqrt((facingDrag.to.x - facingDrag.from.x) ** 2 + (facingDrag.to.y - facingDrag.from.y) ** 2))
            : undefined,
          fast: previewOrder === 'move',
        })
      : null;
  }, [planKey, queuedKey]);

  // route-around-wire: the queued routes are drawn with the preview.
  const shownPlan: PreviewPlan | null = useMemo(() => {
    if (hudHidden || !queued || queued.paths.length === 0) return previewPlan;
    return previewPlan
      ? { ...previewPlan, paths: [...queued.paths, ...previewPlan.paths] }
      : { unitIds: queued.paths.map((path) => path.unitId), paths: queued.paths, cones: [], los: [] };
  }, [previewPlan, queued, hudHidden]);

  // Cover slots under the cursor, and the ones the pending ground order would fill.
  const hoveredCoverId =
    frame && hoverPoint && !hudHidden ? (coverAtPoint(hoverPoint, frame.covers)?.id ?? null) : null;
  const heldKey = frame
    ? frame.units.map((unit) => (unit.slotId == null ? '' : `${unit.id}:${unit.slotId}`)).join(',')
    : '';
  const selectionKey = selectedIds.join(',');
  const plannedKey = (previewPlan?.paths ?? []).map((path) => path.slotId ?? '').join(',');
  const slotView: CoverSlotView | null = useMemo(() => {
    if (!frame || hoveredCoverId === null || !hoverPoint) {
      return null;
    }
    const planned = new Set<number>();
    for (const path of previewPlan?.paths ?? []) {
      if (path.slotId !== undefined) {
        planned.add(path.slotId);
      }
    }
    if (previewOrder === 'move' && planned.size === 0) {
      const movers = frame.units.filter(
        (unit) => selectedIds.includes(unit.id) && unit.alive && !unit.incapacitated && !unit.routed,
      );
      const anchors = new Map(movers.map((unit) => [unit.id, hoverPoint]));
      const held = new Map<number, number>();
      for (const unit of frame.units) {
        if (unit.slotId != null && !selectedIds.includes(unit.id)) held.set(unit.slotId, unit.id);
      }
      // The simulation's move rule: the nearest enemy the side sees, else the
      // way the movers aim or face (author-game-maps 3.6).
      const threat = movers[0] ? nearestKnownEnemyAt(frame, hoverPoint, movers[0].faction) : null;
      const facing = averageAim(movers) ?? averageFacing(movers) ?? null;
      for (const slot of planCoverSlots(movers, anchors, frame.covers, { held, threat, facing, click: hoverPoint }).values()) {
        planned.add(slot.id);
      }
    }
    return coverSlotView(frame.covers, frame.units, hoverPoint, planned);
    // Recompute only when the hovered cover, the selection, the order or a holder changes.
  }, [hoveredCoverId, selectionKey, previewOrder, heldKey, plannedKey]);

  // add-deployment-phase 3.2 (D5): in deployment, the slots within 25 m of the cursor, by class, counted per piece.
  const battleMapId: BattleMapId | undefined = clientRef.current?.battleMap;
  const deploymentCell = deploymentPreview && hoverPoint && !hudHidden ? `${Math.round(hoverPoint.x / 2)}:${Math.round(hoverPoint.y / 2)}` : null;
  const deploymentSlots: DeploymentSlotView | null = useMemo(() => {
    const current = latestFrame.current;
    if (!deploymentCell || !current || !hoverPoint) return null;
    const planned = new Set<number>();
    for (const path of previewPlan?.paths ?? []) if (path.slotId !== undefined) planned.add(path.slotId);
    let map = null;
    try {
      map = battleMapId ? mapById(battleMapId) : null;
    } catch {
      map = null;
    }
    return deploymentSlotView(map, current.covers, current.units, hoverPoint, planned);
  }, [deploymentCell, heldKey, plannedKey, battleMapId]);

  // garrison-and-assault 4.1: the map's positions, rebuilt when the works change (trenches dug in the editor).
  const coverCount = frame?.covers.length ?? 0;
  const positions: readonly PositionDef[] = useMemo(() => {
    const current = latestFrame.current;
    if (!battleMapId || !current) return [];
    try {
      const map = mapById(battleMapId);
      return positionsFor({ buildings: map.buildings, covers: current.covers, garrisonYards: map.garrisonYards });
    } catch {
      return [];
    }
  }, [battleMapId, coverCount]);
  /** Sair: the 30 m ring around the selection's position, while the order waits for its point. */
  const exitRing = useMemo(() => {
    if (pendingTactical !== 'exit') return null;
    const positionId = selectedUnits.find((unit) => unit.garrison !== undefined)?.garrison;
    const position = positions.find((entry) => entry.id === positionId);
    return position ? { x: position.x, y: position.y, radius: 30 } : null;
  }, [pendingTactical, selectedUnits.map((unit) => unit.garrison ?? '').join(','), positions]);

  /** Sends an order on a position (Ocupar, Assaltar), or keeps waiting when the click meant none. */
  const sendPositionOrder = (order: 'enter' | 'assault', positionId: number | undefined, queue = false): boolean => {
    if (positionId === undefined || selectedIds.length === 0) return false;
    clientRef.current?.sendCommand(
      order === 'enter'
        ? { type: 'order', order: 'enter', unitIds: selectedIds, positionId, ...(queue ? { queue: true } : {}) }
        : { type: 'assault', unitIds: selectedIds, positionId },
    );
    triggerOrderCallout(order, selectedIds);
    setPendingTactical(null);
    return true;
  };
  const ownSide = (): 'column' | 'legalist' => (selectedUnits[0]?.faction === 'legalist' ? 'legalist' : 'column');
  const enemyHeld = (position: PositionDef): boolean =>
    frame?.garrisons?.some((garrison) => garrison.positionId === position.id && garrison.side !== ownSide()) ?? false;

  useEffect(() => {
    if (!frame) {
      return;
    }
    const boundingUnit = frame.units.find(
      (unit) => unit.faction === 'column' && unit.boundPhase !== null && unit.boundTeam !== null,
    );
    if (!boundingUnit) {
      lastBoundPhase.current = null;
      return;
    }
    const key = `${boundingUnit.boundTeam}:${boundingUnit.boundPhase}`;
    if (lastBoundPhase.current === key) {
      return;
    }
    lastBoundPhase.current = key;
    const text = translate(
      locale,
      boundingUnit.boundPhase === 'advance' ? 'hud.boundAdvance' : 'hud.boundCover',
    );
    const officer = frame.units.find(
      (unit) => unit.faction === 'column' && unit.kind === 'officer' && unit.alive,
    );
    setOrderCallout({
      officerId: officer?.id ?? null,
      troopIds: frame.units
        .filter((unit) => unit.faction === 'column' && unit.boundTeam !== null)
        .map((unit) => unit.id),
      officerText: text,
      troopText: text,
    });
  }, [frame, locale]);

  const triggerOrderCallout = (orderId: string, unitIds: number[]): void => {
    if (unitIds.length === 0) {
      return;
    }
    const faction = selectedUnits[0]?.faction ?? 'column';
    const officer = frame?.units.find(
      (unit) => unit.kind === 'officer' && unit.faction === faction && unit.alive,
    );
    const labelKey = ORDER_CATALOG.find((entry) => entry.id === orderId)?.labelKey;
    const orderName = labelKey
      ? translate(locale, labelKey)
      : translate(locale, 'hud.orderMove');
    setOrderCallout({
      officerId: officer?.id ?? null,
      troopIds: unitIds,
      officerText: translate(locale, 'hud.calloutOfficer', { order: orderName }),
      troopText: translate(locale, 'hud.calloutTroop', { order: orderName }),
    });
  };
  const triggerPostureCallout = (next: Posture): void => {
    if (selectedIds.length === 0) {
      return;
    }
    const faction = selectedUnits[0]?.faction ?? 'column';
    const officer = frame?.units.find(
      (unit) => unit.kind === 'officer' && unit.faction === faction && unit.alive,
    );
    const key =
      next === 'aggressive'
        ? 'hud.postureAggressive'
        : next === 'defensive'
          ? 'hud.postureDefensive'
          : next === 'protect-officer'
            ? 'hud.postureProtectOfficer'
            : 'hud.postureBalanced';
    const postureName = translate(locale, key);
    setOrderCallout({
      officerId: officer?.id ?? null,
      troopIds: selectedIds,
      officerText: translate(locale, 'hud.calloutPosture', { posture: postureName }),
      troopText: translate(locale, 'hud.calloutTroop', {
        order: `${translate(locale, 'hud.posture')}: ${postureName}`,
      }),
    });
  };

  /**
   * add-difficulty-levels 5.2: each fire control setting has its own line and
   * answer (the captions of the voice lines; until they are recorded, the
   * caption is all there is).
   */
  const triggerFireControlCallout = (mode: FireControl): void => {
    if (selectedIds.length === 0) {
      return;
    }
    const faction = selectedUnits[0]?.faction ?? 'column';
    const officer = frame?.units.find(
      (unit) => unit.kind === 'officer' && unit.faction === faction && unit.alive,
    );
    const text = translate(locale, FIRE_CONTROL_CALLOUT[mode]);
    const answer = FIRE_CONTROL_ANSWER[mode];
    setOrderCallout({
      officerId: officer?.id ?? null,
      troopIds: selectedIds,
      officerText: text,
      // With no officer to speak it, the section's bubble carries the command too.
      troopText: answer
        ? officer
          ? translate(locale, answer)
          : `${text} ${translate(locale, answer)}`
        : translate(locale, 'hud.calloutTroop', { order: text }),
    });
  };

  const handleClearOrder = (): void => {
    const hadPending = pendingOrder !== null || pendingTactical !== null || aimPending;
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setLineDrag(null);
    if (!hadPending && selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'hold', unitIds: selectedIds });
      triggerOrderCallout('hold', selectedIds);
    }
  };

  const handleAim = (): void => {
    setPendingOrder(null);
    setPendingTactical(null);
    setPreviewEnabled(true);
    setAimPending((value) => !value);
  };

  const handlePreviewGround = (point: Vec2 | null): void => {
    setHoverPoint(point);
    if (point) {
      setHoverUnitId(null);
    }
  };

  const handlePreviewUnit = (unitId: number | null): void => {
    const unit = unitId === null ? null : frame?.units.find((entry) => entry.id === unitId);
    setHoverUnitId(unit && unit.faction !== 'column' ? unitId : null);
    setTargetUnitIds(
      unit && unit.faction !== 'column'
        ? (frame?.units ?? [])
            .filter(
              (member) =>
                member.faction === unit.faction &&
                member.squadId === unit.squadId &&
                member.alive &&
                !member.routed,
            )
            .map((member) => member.id)
        : [],
    );
    if (unit) {
      setHoverPoint(null);
    }
  };

  const canSelect = (unit: { faction: string; squadId: number }): boolean =>
    (unit.faction === 'column' && unit.squadId !== 99) ||
    (controlBothSides && unit.faction === 'legalist');

  const selectSquad = (squadId: number): void => {
    if (!frame) {
      return;
    }
    setSelectedUnitIds(
      frame.units
        .filter(
          (unit) =>
            unit.squadId === squadId &&
            canSelect(unit) &&
            unit.alive &&
            !unit.routed &&
            !unit.dummy,
        )
        .map((unit) => unit.id),
    );
  };

  const handleOrder = (mode: OrderMode): void => {
    setPreviewEnabled(true);
    setPendingOrder(mode);
    setPendingTactical(null);
    setAimPending(false);
  };

  const handleTacticalOrder = (order: TacticalOrder, queue = false): void => {
    setPreviewEnabled(true);
    if (order === 'regroup' || order === 'protect-officer') {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'order', order, unitIds: selectedIds, ...(queue ? { queue: true } : {}) });
        triggerOrderCallout(order, selectedIds);
      }
      setPendingTactical(null);
      setPendingOrder(null);
      setAimPending(false);
      return;
    }
    setPendingTactical(order);
    setPendingOrder(null);
    setAimPending(false);
  };

  const handleSelectSquad = (squadId: number): void => {
    setSelectedSquadId(squadId);
    selectSquad(squadId);
  };

  const handleSelectUnits = (unitIds: number[], mode: SelectionMode): void => {
    if (!frame) {
      return;
    }
    const selected = frame.units.filter(
      (unit) =>
        unitIds.includes(unit.id) &&
        canSelect(unit) &&
        unit.alive &&
        !unit.routed &&
        !unit.dummy &&
        (mode === 'all' || unit.kind !== 'officer'),
    );
    const squadId = selected[0]?.squadId;
    if (squadId === undefined) {
      return;
    }
    setSelectedSquadId(squadId);
    setSelectedUnitIds(
      selected.filter((unit) => unit.squadId === squadId).map((unit) => unit.id),
    );
  };

  const handleSelectUnit = (unitId: number): void => {
    const unit = frame?.units.find((entry) => entry.id === unitId);
    if (unit?.alive && canSelect(unit)) {
      setSelectedSquadId(unit.squadId);
      selectSquad(unit.squadId);
    }
  };

  const sendTroopTargetOrder = (
    kind: 'attack' | 'suppress' | 'flank' | 'pursue',
    target: { id: number; faction: string; squadId: number; x: number; y: number },
    queue = false,
  ): void => {
    const members = (frame?.units ?? []).filter(
      (unit) =>
        unit.faction === target.faction &&
        unit.squadId === target.squadId &&
        unit.alive &&
        !unit.routed &&
        !unit.incapacitated,
    );
    if (members.length === 0 || selectedIds.length === 0) {
      return;
    }
    const attackers = selectedIds
      .map((unitId) => frame?.units.find((entry) => entry.id === unitId))
      .filter((unit): unit is NonNullable<typeof unit> => unit !== undefined);
    // Fire orders spread over the whole troop; flank and pursue chase the
    // nearest member.
    const groups =
      kind === 'attack' || kind === 'suppress'
        ? spreadTargetGroups(attackers, members)
        : nearestTargetGroups(attackers, members);
    for (const [targetId, unitIds] of groups) {
      if (kind === 'pursue') {
        clientRef.current?.sendCommand({
          type: 'order',
          order: 'pursue',
          unitIds,
          targetId,
          ...(queue ? { queue: true } : {}),
        });
      } else {
        clientRef.current?.sendCommand({ type: kind, unitIds, targetId, ...(queue ? { queue: true } : {}) });
      }
    }
    triggerOrderCallout(kind, selectedIds);
  };

  const targetTroopCenter = (target: { faction: string; squadId: number; x: number; y: number }): Vec2 => {
    const members = (frame?.units ?? []).filter(
      (unit) => unit.faction === target.faction && unit.squadId === target.squadId,
    );
    if (members.length === 0) {
      return { x: target.x, y: target.y };
    }
    return members.reduce(
      (sum, unit) => ({ x: sum.x + unit.x / members.length, y: sum.y + unit.y / members.length }),
      { x: 0, y: 0 },
    );
  };
  // A click on a fallen enemy still means "that troop": use its nearest living
  // member, so the order is not silently lost on a body.
  const livingTroopMember = (unitId: number) => {
    const clicked = frame?.units.find((entry) => entry.id === unitId);
    if (!clicked) {
      return undefined;
    }
    const selectedFaction = selectedUnits[0]?.faction ?? 'column';
    if ((clicked.alive && !clicked.incapacitated) || clicked.faction === selectedFaction) {
      return clicked.alive ? clicked : undefined;
    }
    return (frame?.units ?? [])
      .filter(
        (unit) =>
          unit.faction === clicked.faction &&
          unit.squadId === clicked.squadId &&
          unit.alive &&
          !unit.incapacitated &&
          !unit.routed,
      )
      .sort(
        (left, right) =>
          (left.x - clicked.x) ** 2 + (left.y - clicked.y) ** 2 - ((right.x - clicked.x) ** 2 + (right.y - clicked.y) ** 2),
      )[0];
  };

  const handleAttackUnit = (unitId: number, queue = false): void => {
    const queueOrder = queue || queueNext;
    setQueueNext(false);
    const target =
      pendingTactical === 'rescue'
        ? frame?.units.find((entry) => entry.id === unitId)
        : livingTroopMember(unitId);
    if (!target || !target.alive) {
      return;
    }
    unitId = target.id;
    if (!pendingOrder && !pendingTactical && !aimPending) {
      handleSelectUnit(unitId);
      return;
    }
    // scrub-concealment-and-area-fire: Area fire is laid on suspected contacts, not on seen men.
    if (pendingOrder === 'area-fire') {
      return;
    }
    if (
      pendingTactical &&
      ['advance', 'defend', 'ambush', 'disperse', 'recon', 'reserve', 'exit'].includes(pendingTactical)
    ) {
      return;
    }
    // garrison-and-assault 4.1: a click on a man inside a position means that position.
    if (pendingTactical === 'enter' || pendingTactical === 'assault') {
      sendPositionOrder(pendingTactical, target.garrison);
      return;
    }
    if (aimPending) {
      const center = targetTroopCenter(target);
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({
          type: 'face',
          unitIds: selectedIds,
          to: center,
        });
      }
      triggerOrderCallout('aim', selectedIds);
      setAimPending(false);
      return;
    }
    if (pendingTactical === 'pursue') {
      sendTroopTargetOrder('pursue', target, queueOrder);
      setPendingTactical(null);
      return;
    }
    if (pendingTactical === 'rescue') {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({
          type: 'order',
          order: 'rescue',
          unitIds: selectedIds,
          targetId: target.id,
          ...(queueOrder ? { queue: true } : {}),
        });
        triggerOrderCallout('rescue', selectedIds);
        setPendingTactical(null);
      }
      return;
    }
    const selectedFaction = selectedUnits[0]?.faction ?? 'column';
    if (target.faction === selectedFaction) {
      setSelectedSquadId(target.squadId);
      selectSquad(target.squadId);
      return;
    }
    if (selectedIds.length === 0) {
      return;
    }
    const type =
      pendingOrder === 'suppress' ? 'suppress' : pendingOrder === 'flank' ? 'flank' : 'attack';
    sendTroopTargetOrder(type, target, queueOrder);
    setPendingOrder(null);
  };

  const handlePrimaryGround = (point: Vec2, facing?: Vec2, queue = false): void => {
    const queueOrder = queue || queueNext;
    setQueueNext(false);
    setFacingDrag(null);
    if (aimPending) {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'face', unitIds: selectedIds, to: point });
      }
      triggerOrderCallout('aim', selectedIds);
      setAimPending(false);
      return;
    }
    // scrub-concealment-and-area-fire: Area fire takes the "?" or ghost clicked;
    // a click on bare ground sends nothing and keeps the order armed.
    if (pendingOrder === 'area-fire') {
      const contact = pickSuspectedContact(frame as (Frame & FogExtras) | null, point);
      if (contact && selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'area_fire', unitIds: selectedIds, to: contact });
        triggerOrderCallout('area-fire', selectedIds);
        setPendingOrder(null);
      }
      return;
    }
    // garrison-and-assault 4.1: Ocupar and Assaltar take the position clicked; Sair, the point.
    if (pendingTactical === 'enter') {
      sendPositionOrder('enter', positionNear(positions, point, (position) => !enemyHeld(position))?.id, queueOrder);
      return;
    }
    if (pendingTactical === 'assault') {
      sendPositionOrder('assault', positionNear(positions, point, enemyHeld)?.id);
      return;
    }
    if (pendingTactical === 'exit') {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'order', order: 'exit', unitIds: selectedIds, to: point, ...(queueOrder ? { queue: true } : {}) });
        triggerOrderCallout('exit', selectedIds);
      }
      setPendingTactical(null);
      return;
    }
    if (
      pendingTactical &&
      ['advance', 'defend', 'ambush', 'disperse', 'recon', 'reserve'].includes(pendingTactical)
    ) {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({
          type: 'order',
          order: pendingTactical,
          unitIds: selectedIds,
          to: point,
          ...dragOrder(facing),
          ...(queueOrder ? { queue: true } : {}),
        });
      }
      triggerOrderCallout(pendingTactical, selectedIds);
      setPendingTactical(null);
      return;
    }
    if (pendingOrder === 'move' && selectedIds.length > 0) {
      clientRef.current?.sendCommand({
        type: 'move',
        unitIds: selectedIds,
        to: point,
        ...dragOrder(facing),
        ...(queueOrder ? { queue: true } : {}),
      });
      triggerOrderCallout('move', selectedIds);
      setPendingOrder(null);
    }
  };

  const handleQuickGround = (point: Vec2, facing?: Vec2, queue = false): void => {
    const queueOrder = queue || queueNext;
    setQueueNext(false);
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setLineDrag(null);
    setFacingDrag(null);
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({
      type: 'move',
      unitIds: selectedIds,
      to: point,
      ...dragOrder(facing),
      ...(queueOrder ? { queue: true } : {}),
    });
    triggerOrderCallout('move', selectedIds);
  };

  const handlePreviewLine = (line: { from: Vec2; to: Vec2 } | null): void => {
    setLineDrag(line);
    if (line) {
      setPreviewEnabled(true);
      setHoverPoint(null);
      setHoverUnitId(null);
    }
  };

  const handlePreviewFacing = (drag: { from: Vec2; to: Vec2 } | null): void => {
    setFacingDrag(drag);
    if (drag) {
      setPreviewEnabled(true);
      setHoverPoint(null);
      setHoverUnitId(null);
    }
  };

  const handlePrimaryLine = (from: Vec2, to: Vec2): void => {
    if (selectedIds.length === 0) {
      return;
    }
    setPreviewEnabled(true);
    clientRef.current?.sendCommand({ type: 'move_line', unitIds: selectedIds, from, to });
    triggerOrderCallout('move', selectedIds);
    setPendingOrder(null);
    setLineDrag(null);
  };

  const handleQuickLine = (from: Vec2, to: Vec2): void => {
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setLineDrag(null);
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'move_line', unitIds: selectedIds, from, to });
    triggerOrderCallout('move', selectedIds);
  };

  const handleQuickUnit = (unitId: number, queue = false): void => {
    const queueOrder = queue || queueNext;
    setQueueNext(false);
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    const target = livingTroopMember(unitId);
    if (!target || !target.alive) {
      return;
    }
    unitId = target.id;
    const selectedFaction = selectedUnits[0]?.faction ?? 'column';
    // A wounded comrade: the casualty drill (rescue) starts from him.
    if (target.faction === selectedFaction && target.incapacitated && selectedIds.length > 0) {
      clientRef.current?.sendCommand({
        type: 'order',
        order: 'rescue',
        unitIds: selectedIds,
        targetId: target.id,
        ...(queueOrder ? { queue: true } : {}),
      });
      triggerOrderCallout('rescue', selectedIds);
      return;
    }
    if (target.faction === selectedFaction) {
      handleSelectUnit(unitId);
      return;
    }
    sendTroopTargetOrder('attack', target, queueOrder);
  };

  const handleActivateOrder = (order: string, _activation: string, queue = false): void => {
    if (selectedIds.length === 0) {
      return;
    }
    if (order === 'withdraw') {
      handleWithdraw(queue);
      return;
    }
    if (order === 'hold') {
      setQueueNext(false);
      // Halt clears every pending order (as Escape does), then stops the
      // section at once and takes cover; turning its front is Aim's job.
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
      setLineDrag(null);
      setFacingDrag(null);
      handleHold();
      return;
    }
    if (order === 'aim') {
      setQueueNext(false);
      handleAim();
      return;
    }
    if (order === 'regroup') {
      handleTacticalOrder('regroup', queue);
      return;
    }
    if (
      order === 'attack' ||
      order === 'suppress' ||
      order === 'flank' ||
      order === 'move'
    ) {
      setQueueNext(queue);
      handleOrder(order);
      return;
    }
    // scrub-concealment-and-area-fire: armed, then a "?" or a ghost is clicked (never queued).
    if (order === 'area-fire') {
      setQueueNext(false);
      handleOrder('area-fire');
      return;
    }
    if (
      order === 'pursue' ||
      order === 'rescue' ||
      order === 'advance' ||
      order === 'defend' ||
      order === 'ambush' ||
      order === 'disperse' ||
      order === 'recon' ||
      order === 'reserve' ||
      order === 'enter' ||
      order === 'exit' ||
      order === 'assault'
    ) {
      setQueueNext(queue);
      handleTacticalOrder(order, queue);
    }
  };

  const handlePosture = (next: Posture): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'posture', unitIds: selectedIds, posture: next });
    triggerPostureCallout(next);
  };

  /** Closes the selected section on its centre (G; the old Regroup order). */
  const handleRegroup = (): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'order', order: 'regroup', unitIds: selectedIds });
    triggerOrderCallout('regroup', selectedIds);
  };

  /** Free fire, economical fire, fire on contact (ambush) or hold fire. */
  const handleFireControl = (mode: FireControl): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'fire_control', unitIds: selectedIds, mode });
    triggerFireControlCallout(mode);
  };
  /** add-run-toggle: Walk or Run for the selected sections. */
  const handleHurry = (on: boolean): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'hurry', unitIds: selectedIds, hurry: on });
  };
  const handleFormation = (formation: FormationKind): void => {
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'formation', unitIds: selectedIds, formation });
    }
  };

  const handleStance = (stance: Stance): void => {
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'stance', unitIds: selectedIds, stance });
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  const handleWithdraw = (queue = false): void => {
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'withdraw', unitIds: selectedIds, ...(queue ? { queue: true } : {}) });
      triggerOrderCallout('withdraw', selectedIds);
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  const handleHold = (): void => {
    setQueueNext(false);
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'hold', unitIds: selectedIds });
      triggerOrderCallout('hold', selectedIds);
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  return {
    slotView,
    positions,
    exitRing,
    selectedSquadId,
    setSelectedSquadId,
    selectedUnitIds,
    setSelectedUnitIds,
    pendingOrder,
    setPendingOrder,
    pendingTactical,
    setPendingTactical,
    aimPending,
    setAimPending,
    orderCallout,
    previewEnabled,
    setPreviewEnabled,
    deploymentSlots,
    hoverUnitId,
    targetUnitIds,
    selectedUnits,
    selectedIds,
    holdFire,
    fireControl,
    posture,
    needsTarget,
    previewPlan: shownPlan,
    selectSquad,
    handleClearOrder,
    handlePreviewGround,
    handlePreviewUnit,
    handleSelectSquad,
    handleSelectUnits,
    handleAttackUnit,
    handlePrimaryGround,
    handleQuickGround,
    handlePreviewLine,
    handlePreviewFacing,
    handlePrimaryLine,
    handleQuickLine,
    handleQuickUnit,
    handleActivateOrder,
    handlePosture,
    handleFireControl,
    handleRegroup,
    handleFormation,
    handleStance,
    hurry,
    handleHurry,
  };
}
