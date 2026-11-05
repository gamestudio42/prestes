import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { ORDER_CATALOG, translate, type Locale, type TrainingAction } from '@prestes/content';
import {
  nearestTargetGroups,
  spreadTargetGroups,
  planOrderPreview,
  dragSpacing,
  coverAtPoint,
  coverSlotView,
  planCoverSlots,
  type CoverSlotView,
  type FireControl,
  type FormationKind,
  type Frame,
  type Posture,
  type PreviewPlan,
  type Stance,
  type TacticalOrder,
  type Vec2,
} from '@prestes/shared';
import { previewKey } from './previewKey';
import type { OrderCallout, PlacementPreview } from '@prestes/view3d';
import type { GameClient } from '../client/GameClient';
import type { SelectionMode } from '../ui/GameCanvas';
import type { OrderMode } from '../ui/Hud';
import type { SandboxTool } from '../ui/SandboxPanel';

interface OrderOptions {
  frame: Frame | null;
  locale: Locale;
  clientRef: MutableRefObject<GameClient | null>;
  speed: 0 | 1 | 2 | 4 | 8;
  hudHidden: boolean;
  controlBothSides: boolean;
  setControlBothSides: Dispatch<SetStateAction<boolean>>;
  sandboxTool: SandboxTool | null;
  placementPreview: PlacementPreview | null;
  placementRotation: number;
  setPlacementPoint: Dispatch<SetStateAction<Vec2 | null>>;
  recordTrainingAction: (action: TrainingAction) => void;
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
export function useOrders({
  frame,
  locale,
  clientRef,
  speed,
  hudHidden,
  controlBothSides,
  setControlBothSides,
  sandboxTool,
  placementPreview,
  placementRotation,
  setPlacementPoint,
  recordTrainingAction,
}: OrderOptions) {
  const [selectedSquadId, setSelectedSquadId] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [pendingOrder, setPendingOrder] = useState<OrderMode | null>(null);
  const [pendingTactical, setPendingTactical] = useState<TacticalOrder | null>(null);
  const [aimPending, setAimPending] = useState(false);
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
  const posture = selectedUnits[0]?.posture ?? 'balanced';
  const previewOrder =
    pendingTactical ?? pendingOrder ?? (aimPending ? 'aim' : facingDrag || lineDrag ? 'move' : null);
  const needsTarget =
    pendingOrder === 'attack' ||
    pendingOrder === 'suppress' ||
    pendingOrder === 'flank' ||
    pendingTactical === 'pursue' ||
    pendingTactical === 'rescue';
  // Recomputed only when what it depends on changes, not on every frame
  // (movement-polish: a still pointer over a running battle cost a preview a frame).
  const previewActive = Boolean(
    previewEnabled && !hudHidden && frame && previewOrder && (!needsTarget || hoverUnitId !== null),
  );
  const planKey = previewActive
    ? previewKey({
        order: previewOrder!,
        selected: selectedUnits,
        hoverPoint,
        hoverUnitId,
        formation: selectedUnits[0]?.formation,
        drag: facingDrag ?? lineDrag,
        dragKind: facingDrag ? 'facing' : lineDrag ? 'line' : null,
      })
    : null;
  const latestFrame = useRef(frame);
  latestFrame.current = frame;
  const previewPlan: PreviewPlan | null = useMemo(() => {
    const frame = latestFrame.current;
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
  }, [planKey]);

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
      for (const slot of planCoverSlots(movers, anchors, frame.covers, { held, click: hoverPoint }).values()) {
        planned.add(slot.id);
      }
    }
    return coverSlotView(frame.covers, frame.units, hoverPoint, planned);
    // Recompute only when the hovered cover, the selection, the order or a holder changes.
  }, [hoveredCoverId, selectionKey, previewOrder, heldKey, plannedKey]);

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

  const triggerHoldFireCallout = (holding: boolean): void => {
    if (selectedIds.length === 0) {
      return;
    }
    const faction = selectedUnits[0]?.faction ?? 'column';
    const officer = frame?.units.find(
      (unit) => unit.kind === 'officer' && unit.faction === faction && unit.alive,
    );
    const text = translate(locale, holding ? 'hud.calloutHoldFire' : 'hud.calloutFire');
    setOrderCallout({
      officerId: officer?.id ?? null,
      troopIds: selectedIds,
      officerText: text,
      troopText: translate(locale, 'hud.calloutTroop', { order: text }),
    });
  };

  const handleTogglePreview = (): void => {
    setPreviewEnabled((value) => !value);
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
    setPlacementPoint(sandboxTool ? point : null);
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
    recordTrainingAction('select');
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

  const handleToggleControlBothSides = (): void => {
    const next = !controlBothSides;
    setControlBothSides(next);
    if (!next && selectedSquadId !== 1) {
      setSelectedSquadId(1);
      selectSquad(1);
    }
  };

  const handleOrder = (mode: OrderMode): void => {
    setPreviewEnabled(true);
    setPendingOrder(mode);
    setPendingTactical(null);
    setAimPending(false);
  };

  const handleTacticalOrder = (order: TacticalOrder): void => {
    setPreviewEnabled(true);
    if (order === 'regroup' || order === 'protect-officer') {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'order', order, unitIds: selectedIds });
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
    recordTrainingAction('select');
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
    recordTrainingAction('box-select');
    setSelectedSquadId(squadId);
    setSelectedUnitIds(
      selected.filter((unit) => unit.squadId === squadId).map((unit) => unit.id),
    );
  };

  const handleSelectUnit = (unitId: number): void => {
    const unit = frame?.units.find((entry) => entry.id === unitId);
    if (unit?.alive && canSelect(unit)) {
      recordTrainingAction('select');
      setSelectedSquadId(unit.squadId);
      selectSquad(unit.squadId);
    }
  };

  const sendTroopTargetOrder = (
    kind: 'attack' | 'suppress' | 'flank' | 'pursue',
    target: { id: number; faction: string; squadId: number; x: number; y: number },
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
        });
      } else {
        clientRef.current?.sendCommand({ type: kind, unitIds, targetId });
      }
    }
    recordTrainingAction(kind);
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

  const handleAttackUnit = (unitId: number): void => {
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
    if (
      pendingTactical &&
      ['advance', 'defend', 'ambush', 'disperse', 'recon', 'reserve'].includes(pendingTactical)
    ) {
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
        recordTrainingAction('face');
      }
      triggerOrderCallout('aim', selectedIds);
      setAimPending(false);
      return;
    }
    if (pendingTactical === 'pursue') {
      sendTroopTargetOrder('pursue', target);
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
        });
        recordTrainingAction('rescue');
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
    sendTroopTargetOrder(type, target);
    setPendingOrder(null);
  };

  const handlePrimaryGround = (point: Vec2, facing?: Vec2): void => {
    setFacingDrag(null);
    if (aimPending) {
      if (selectedIds.length > 0) {
        clientRef.current?.sendCommand({ type: 'face', unitIds: selectedIds, to: point });
      }
      recordTrainingAction('face');
      triggerOrderCallout('aim', selectedIds);
      setAimPending(false);
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
        });
      }
      recordTrainingAction(pendingTactical as TrainingAction);
      triggerOrderCallout(pendingTactical, selectedIds);
      setPendingTactical(null);
      return;
    }
    if (sandboxTool) {
      if (!placementPreview?.valid) {
        return;
      }
      const command =
        sandboxTool === 'enemy-troop'
          ? { type: 'spawn_troop' as const, to: point, faction: 'legalist' as const, count: 11, rotation: placementRotation }
          : sandboxTool === 'command-troop'
            ? { type: 'spawn_troop' as const, to: point, faction: 'column' as const, count: 3, rotation: placementRotation }
            : sandboxTool === 'dummy'
              ? { type: 'spawn_dummy' as const, to: point, rotation: placementRotation }
              : { type: 'spawn_cover' as const, kind: sandboxTool, to: point, rotation: placementRotation };
      clientRef.current?.sendCommand(command);
      if (speed === 0) {
        clientRef.current?.step(1);
      }
      return;
    }
    if (pendingOrder === 'move' && selectedIds.length > 0) {
      recordTrainingAction('move');
      clientRef.current?.sendCommand({ type: 'move', unitIds: selectedIds, to: point, ...dragOrder(facing) });
      triggerOrderCallout('move', selectedIds);
      setPendingOrder(null);
    }
  };

  const handleQuickGround = (point: Vec2, facing?: Vec2): void => {
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setLineDrag(null);
    setFacingDrag(null);
    if (selectedIds.length === 0) {
      return;
    }
    recordTrainingAction('move');
    clientRef.current?.sendCommand({ type: 'move', unitIds: selectedIds, to: point, ...dragOrder(facing) });
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
    recordTrainingAction('move');
    clientRef.current?.sendCommand({ type: 'move_line', unitIds: selectedIds, from, to });
    triggerOrderCallout('move', selectedIds);
  };

  const handleQuickUnit = (unitId: number): void => {
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
      clientRef.current?.sendCommand({ type: 'order', order: 'rescue', unitIds: selectedIds, targetId: target.id });
      recordTrainingAction('rescue');
      triggerOrderCallout('rescue', selectedIds);
      return;
    }
    if (target.faction === selectedFaction) {
      handleSelectUnit(unitId);
      return;
    }
    sendTroopTargetOrder('attack', target);
  };

  const handleActivateOrder = (order: string, _activation: string): void => {
    if (selectedIds.length === 0) {
      return;
    }
    if (order === 'withdraw') {
      handleWithdraw();
      return;
    }
    if (order === 'hold') {
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
      handleAim();
      return;
    }
    if (order === 'regroup') {
      handleTacticalOrder('regroup');
      return;
    }
    if (
      order === 'attack' ||
      order === 'suppress' ||
      order === 'flank' ||
      order === 'move'
    ) {
      handleOrder(order);
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
      order === 'reserve'
    ) {
      handleTacticalOrder(order);
    }
  };

  const handlePosture = (next: Posture): void => {
    if (next === 'protect-officer') {
      recordTrainingAction('protect-officer');
    }
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
    recordTrainingAction('regroup' as TrainingAction);
    triggerOrderCallout('regroup', selectedIds);
  };

  /** Free fire, fire on contact (ambush) or hold fire. */
  const handleFireControl = (mode: FireControl): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({ type: 'fire_control', unitIds: selectedIds, mode });
    if (mode === 'hold') recordTrainingAction('hold-fire');
    triggerHoldFireCallout(mode !== 'free');
  };
  const handleFormation = (formation: FormationKind): void => {
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'formation', unitIds: selectedIds, formation });
    }
  };

  const handleStance = (stance: Stance): void => {
    if (selectedIds.length > 0) {
      recordTrainingAction(`stance-${stance}` as TrainingAction);
      clientRef.current?.sendCommand({ type: 'stance', unitIds: selectedIds, stance });
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  const handleWithdraw = (): void => {
    if (selectedIds.length > 0) {
      clientRef.current?.sendCommand({ type: 'withdraw', unitIds: selectedIds });
      triggerOrderCallout('withdraw', selectedIds);
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  const handleHold = (): void => {
    if (selectedIds.length > 0) {
      recordTrainingAction('hold');
      clientRef.current?.sendCommand({ type: 'hold', unitIds: selectedIds });
      triggerOrderCallout('hold', selectedIds);
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  return {
    slotView,
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
    hoverUnitId,
    targetUnitIds,
    selectedUnits,
    selectedIds,
    holdFire,
    fireControl,
    posture,
    needsTarget,
    previewPlan,
    selectSquad,
    handleTogglePreview,
    handleClearOrder,
    handlePreviewGround,
    handlePreviewUnit,
    handleToggleControlBothSides,
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
  };
}
