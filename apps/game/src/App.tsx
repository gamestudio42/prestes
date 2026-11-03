import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Eye, Shield } from 'lucide-react';
import {
  BOOTCAMP_EXERCISE,
  ORDER_CATALOG,
  resolveLocale,
  translate,
  type Locale,
  type TrainingAction,
} from '@prestes/content';
import {
  MAP_BOUNDS,
  isPointBlockedByCovers,
  nearestTargetGroups,
  troopFormationOffsets,
  rotateOffset,
  normaliseRotation,
  planOrderPreview,
  type Command,
  type FormationKind,
  type Frame,
  type PreviewPlan,
  type Posture,
  type Stance,
  type TacticalOrder,
  type Vec2,
} from '@prestes/shared';
import type { CameraBand, OrderCallout, PlacementPreview } from '@prestes/view3d';
import { GameClient } from './client/GameClient';
import { ShotAudio, SynthesizedGunshotOutput } from './audio/ShotAudio';
import { CodexPanel } from './ui/CodexPanel';
import { GameCanvas, type SelectionMode } from './ui/GameCanvas';
import { Hud, type OrderMode } from './ui/Hud';
import { SandboxPanel, type SandboxTool } from './ui/SandboxPanel';
import { StartScreen } from './ui/StartScreen';
import { TrainingMissionPanel } from './ui/TrainingMissionPanel';
import {
  advanceExercise,
  currentPhase,
  markersForPhase,
  objectivePlaceholders,
  phaseCommand,
  retryPhase,
  startExercise,
  type ExerciseState,
  type RuntimeObjective,
} from './training/exercise';
import {
  defaultExerciseProgress,
  loadExerciseProgress,
  saveExerciseProgress,
  type ExerciseProgress,
} from './training/exercise-progress';

const LOCALE_STORAGE_KEY = 'prestes.locale';
const AUDIO_STORAGE_KEY = 'prestes.audio.v1';

function loadAudioSettings(): { muted: boolean; volume: number } {
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { muted?: unknown; volume?: unknown };
      return {
        muted: parsed.muted === true,
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.35,
      };
    }
  } catch {
    // Storage can be unavailable; audio still works for this session.
  }
  return { muted: false, volume: 0.35 };
}

function saveAudioSettings(settings: { muted: boolean; volume: number }): void {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable; the session keeps the current settings.
  }
}

type PrestesBridge = {
  command: (command: Command) => void;
  step: (ticks: number) => void;
  frame: () => Frame | null;
};

function loadLocale(): Locale {
  try {
    return resolveLocale(navigator.language, window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return resolveLocale(navigator.language, null);
  }
}

function trainingStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function saveLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable; the session still keeps the selected locale.
  }
}

export function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const [started, setStarted] = useState(false);
  const [sessionMode, setSessionMode] = useState<'battle' | 'training'>('training');
  const [showCodex, setShowCodex] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [band, setBand] = useState<CameraBand>('tactical');
  const [cameraRequest, setCameraRequest] = useState<{ band: CameraBand; nonce: number } | null>(
    null,
  );
  const [postStrong, setPostStrong] = useState(true);
  const [selectedSquadId, setSelectedSquadId] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4>(1);
  const [pendingOrder, setPendingOrder] = useState<OrderMode | null>(null);
  const [pendingTactical, setPendingTactical] = useState<TacticalOrder | null>(null);
  const [aimPending, setAimPending] = useState(false);
  const [lineDrag, setLineDrag] = useState<{ from: Vec2; to: Vec2 } | null>(null);
  const lastBoundPhase = useRef<string | null>(null);
  const [orderCallout, setOrderCallout] = useState<OrderCallout | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxTool, setSandboxTool] = useState<SandboxTool | null>(null);
  const [placementPoint, setPlacementPoint] = useState<Vec2 | null>(null);
  const [placementRotation, setPlacementRotation] = useState(0);
  const [controlBothSides, setControlBothSides] = useState(false);
  const [ordersCollapsed, setOrdersCollapsed] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [boundingEnabled, setBoundingEnabled] = useState(true);
  const [hudHidden, setHudHidden] = useState(false);
  const [audioMuted, setAudioMuted] = useState(() => loadAudioSettings().muted);
  const [audioVolume, setAudioVolume] = useState(() => loadAudioSettings().volume);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [hoverUnitId, setHoverUnitId] = useState<number | null>(null);
  const [targetUnitIds, setTargetUnitIds] = useState<number[]>([]);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress>(() =>
    loadExerciseProgress(trainingStorage()),
  );
  const [exerciseState, setExerciseState] = useState<ExerciseState | null>(null);
  const [exerciseObjectives, setExerciseObjectives] = useState<RuntimeObjective[]>([]);
  const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);
  const [trainingActions, setTrainingActions] = useState<Set<TrainingAction>>(new Set());
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverHint, setHoverHint] = useState<{
    kind: 'cover' | 'target';
    x: number;
    y: number;
  } | null>(null);

  const clientRef = useRef<GameClient | null>(null);
  const audioRef = useRef<ShotAudio | null>(null);
  const cameraNonce = useRef(0);
  const selectionInitialized = useRef(false);
  const exerciseTickRef = useRef(-1);

  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

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

  useEffect(() => {
    const audio = new ShotAudio(new SynthesizedGunshotOutput(), {
      muted: audioMuted,
      volume: audioVolume,
    });
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(audioMuted);
    saveAudioSettings({ muted: audioMuted, volume: audioVolume });
  }, [audioMuted, audioVolume]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setHudHidden((hidden) => !hidden);
      }
      if (event.key === 'F1') {
        event.preventDefault();
        setSandboxOpen((open) => {
          if (open) {
            setSandboxTool(null);
          }
          return !open;
        });
      }
      if (event.key === 'Escape') {
        setSandboxTool((tool) => {
          if (tool) {
            return null;
          }
          setSandboxOpen(false);
          return null;
        });
        setPendingOrder(null);
        setPendingTactical(null);
        setAimPending(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlBothSides, selectedSquadId, sandboxTool]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const bridge: PrestesBridge = {
      command: (command) => clientRef.current?.sendCommand(command),
      step: (ticks) => {
        setSpeed(0);
        clientRef.current?.setSpeed(0);
        clientRef.current?.step(ticks);
      },
      frame: () => clientRef.current?.currentFrame() ?? null,
    };
    const host = window as unknown as { __prestes?: PrestesBridge };
    host.__prestes = bridge;
    return () => {
      delete host.__prestes;
    };
  }, []);

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
  const posture = selectedUnits[0]?.posture ?? 'balanced';
  const previewOrder = pendingTactical ?? pendingOrder ?? (aimPending ? 'aim' : null);
  const needsTarget =
    pendingOrder === 'attack' ||
    pendingOrder === 'suppress' ||
    pendingOrder === 'flank' ||
    pendingTactical === 'pursue' ||
    pendingTactical === 'rescue';
  const previewPlan: PreviewPlan | null =
    previewEnabled && !hudHidden && frame && previewOrder && (!needsTarget || hoverUnitId !== null)
      ? planOrderPreview({
          frame,
          unitIds: selectedIds,
          order: previewOrder,
          formation: selectedUnits[0]?.formation,
          to: lineDrag
            ? {
                x: (lineDrag.from.x + lineDrag.to.x) / 2,
                y: (lineDrag.from.y + lineDrag.to.y) / 2,
              }
            : hoverPoint ?? undefined,
          targetId: hoverUnitId ?? undefined,
          line: pendingOrder === 'move' ? lineDrag ?? undefined : undefined,
          fast: previewOrder === 'move',
        })
      : null;

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
  const handleLocaleChange = (next: Locale): void => {
    setLocale(next);
    saveLocale(next);
  };

  const createClient = (
    training = false,
    opposition = true,
    scenario: 'bootcamp' | 'battle3v3' = 'bootcamp',
  ): GameClient => {
    const client = new GameClient({
      seed: 1922,
      sandbox: true,
      training,
      opposition,
      bounding: boundingEnabled,
      scenario,
      onEvent: (event) => audioRef.current?.handleEvent(event),
      onFrame: (next) => {
        setFrame(next);
        if (!selectionInitialized.current) {
          selectionInitialized.current = true;
          setSelectedUnitIds(
            next.units
              .filter(
                (unit) =>
                  unit.faction === 'column' &&
                  unit.squadId === 1 &&
                  unit.alive &&
                  !unit.routed &&
                  !unit.dummy,
              )
              .map((unit) => unit.id),
          );
        }
      },
    });
    client.setSpeed(1);
    client.start();
    clientRef.current = client;
    return client;
  };

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
  const recordTrainingAction = (action: TrainingAction): void => {
    if (
      sessionMode !== 'training' ||
      !exerciseState ||
      exerciseState.failed ||
      exerciseState.completed
    ) {
      return;
    }
    setTrainingActions((previous) => {
      const next = new Set(previous);
      next.add(action);
      return next;
    });
  };

  const handleStartBootcamp = (restart = false): void => {
    void audioRef.current?.unlock();
    clientRef.current?.dispose();
    clientRef.current = null;
    setFrame(null);
    selectionInitialized.current = false;
    setSelectedUnitIds([]);
    setSelectedSquadId(1);
    setControlBothSides(false);
    setSandboxOpen(false);
    setSandboxTool(null);
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setPreviewEnabled(false);
    setOrdersCollapsed(false);
    setSessionMode('training');
    const progress = restart ? defaultExerciseProgress() : exerciseProgress;
    if (restart) {
      setExerciseProgress(progress);
      saveExerciseProgress(trainingStorage(), progress);
    }
    const initial = startExercise();
    const resumed: ExerciseState = progress.completed
      ? initial
      : {
          ...initial,
          phaseIndex: progress.phaseIndex,
          completedPhases: progress.completedPhases,
        };
    setExerciseState(resumed);
    setExerciseObjectives(objectivePlaceholders(currentPhase(resumed)));
    setExerciseFeedback(null);
    setTrainingActions(new Set());
    setSpeed(1);
    setStarted(true);
    const client = createClient(true, false, 'bootcamp');
    client.sendCommand(phaseCommand(currentPhase(resumed)));
  };

  const handleMissionContinue = (): void => {
    if (exerciseState?.completed) {
      const bestTimeTicks =
        frame && exerciseState.phaseStartedTick > 0
          ? Math.max(600, frame.tick - exerciseState.phaseStartedTick)
          : Math.max(600, exerciseProgress.bestTimeTicks);
      const nextProgress: ExerciseProgress = {
        phaseIndex: exerciseState.phaseIndex,
        completedPhases: exerciseState.completedPhases,
        completed: true,
        bestTimeTicks,
      };
      setExerciseProgress(nextProgress);
      saveExerciseProgress(trainingStorage(), nextProgress);
    }
    clientRef.current?.dispose();
    clientRef.current = null;
    setFrame(null);
    setStarted(false);
    setExerciseState(null);
    setExerciseObjectives([]);
    setExerciseFeedback(null);
    setTrainingActions(new Set());
    setSelectedUnitIds([]);
    setSpeed(1);
  };

  const handleMissionReplay = (): void => {
    handleStartBootcamp(true);
  };

  const handleRetryPhase = (): void => {
    if (!exerciseState) {
      return;
    }
    const result = retryPhase(exerciseState);
    setExerciseState(result.state);
    setExerciseObjectives(objectivePlaceholders(currentPhase(result.state)));
    setExerciseFeedback(null);
    clientRef.current?.sendCommand(result.command);
    setSpeed(1);
    clientRef.current?.setSpeed(1);
  };

  const handleStart = (): void => {
    handleStartBootcamp();
  };
  const handleStartBattle3v3 = (): void => {
    void audioRef.current?.unlock();
    clientRef.current?.dispose();
    clientRef.current = null;
    setFrame(null);
    selectionInitialized.current = false;
    setSelectedUnitIds([]);
    setSelectedSquadId(1);
    setControlBothSides(false);
    setSandboxTool(null);
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setPreviewEnabled(false);
    setOrdersCollapsed(false);
    setExerciseState(null);
    setExerciseObjectives([]);
    setExerciseFeedback(null);
    setTrainingActions(new Set());
    setSessionMode('battle');
    setSpeed(1);
    setStarted(true);
    createClient(false, true, 'battle3v3');
  };
  const handleResetSandbox = (): void => {
    clientRef.current?.reset();
    setFrame(null);
    selectionInitialized.current = false;
    setSelectedUnitIds([]);
    setSpeed(1);
    clientRef.current?.setSpeed(1);
    setSandboxTool(null);
  };

  const handleSetSpeed = (next: 0 | 1 | 2 | 4): void => {
    setSpeed(next);
    clientRef.current?.setSpeed(next);
  };

  const handleTogglePause = (): void => {
    handleSetSpeed(speed === 0 ? 1 : 0);
  };

  const handleStep = (): void => {
    handleSetSpeed(0);
    clientRef.current?.step(1);
  };

  const handleAdvance = (ticks: number): void => {
    handleSetSpeed(0);
    clientRef.current?.step(ticks);
  };

  const handleToggleOrders = (): void => {
    setOrdersCollapsed((value) => !value);
  };

  const handleTogglePreview = (): void => {
    setPreviewEnabled((value) => !value);
  };

  const handleHideHud = (): void => {
    setHudHidden(true);
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

  const handleToggleAudio = (): void => {
    setAudioMuted((value) => !value);
  };

  const handleAudioVolume = (value: number): void => {
    setAudioVolume(Math.max(0, Math.min(1, value)));
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

  const handleCameraBand = (next: CameraBand): void => {
    cameraNonce.current += 1;
    setCameraRequest({ band: next, nonce: cameraNonce.current });
  };

  const handleToggleSandbox = (): void => {
    if (sandboxOpen) {
      setSandboxTool(null);
    }
    setSandboxOpen(!sandboxOpen);
  };

  const handleIncapacitate = (unitId: number): void => {
    clientRef.current?.sendCommand({ type: 'incapacitate', targetId: unitId });
    if (speed === 0) {
      clientRef.current?.step(1);
    }
  };

  const handleRescueCasualty = (unitId: number): void => {
    if (!frame) {
      return;
    }
    const selectedFaction = selectedUnits[0]?.faction ?? 'column';
    const rescuerIds = frame.units
      .filter(
        (unit) =>
          unit.id !== unitId &&
          unit.faction === selectedFaction &&
          unit.alive &&
          !unit.routed &&
          !unit.incapacitated &&
          !unit.dummy,
      )
      .map((unit) => unit.id);
    if (rescuerIds.length > 0) {
      clientRef.current?.sendCommand({
        type: 'order',
        order: 'rescue',
        unitIds: rescuerIds,
        targetId: unitId,
      });
      if (speed === 0) {
        clientRef.current?.step(1);
      }
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

  const handleReinforce = (faction: 'column' | 'legalist'): void => {
    clientRef.current?.sendCommand({ type: 'reinforce', faction });
    if (speed === 0) {
      clientRef.current?.step(1);
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
    const groups = nearestTargetGroups(attackers, members);
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
  const handleAttackUnit = (unitId: number): void => {
    const target = frame?.units.find((entry) => entry.id === unitId);
    if (!target || !target.alive) {
      return;
    }
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

  const handlePrimaryGround = (point: Vec2): void => {
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
      clientRef.current?.sendCommand({ type: 'move', unitIds: selectedIds, to: point });
      triggerOrderCallout('move', selectedIds);
      setPendingOrder(null);
    }
  };

  const handleQuickGround = (point: Vec2): void => {
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setLineDrag(null);
    if (selectedIds.length === 0) {
      return;
    }
    recordTrainingAction('move');
    clientRef.current?.sendCommand({ type: 'move', unitIds: selectedIds, to: point });
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
    const target = frame?.units.find((entry) => entry.id === unitId);
    if (!target || !target.alive) {
      return;
    }
    const selectedFaction = selectedUnits[0]?.faction ?? 'column';
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

  const handleHoldFire = (): void => {
    if (selectedIds.length === 0) {
      return;
    }
    clientRef.current?.sendCommand({
      type: 'hold_fire',
      unitIds: selectedIds,
      hold: !holdFire,
    });
    recordTrainingAction('hold-fire');
    triggerHoldFireCallout(!holdFire);
  };

  const handleToggleBounding = (): void => {
    recordTrainingAction('bounding');
    const next = !boundingEnabled;
    setBoundingEnabled(next);
    clientRef.current?.setBounding(next);
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
      clientRef.current?.sendCommand({ type: 'hold', unitIds: selectedIds });
      triggerOrderCallout('hold', selectedIds);
      setPendingOrder(null);
      setPendingTactical(null);
      setAimPending(false);
    }
  };

  useEffect(() => {
    if (sessionMode !== 'training' || !exerciseState || !frame) {
      return;
    }
    if (exerciseState.failed || exerciseState.completed) {
      return;
    }
    if (exerciseTickRef.current === frame.tick) {
      return;
    }
    const tickDelta =
      exerciseTickRef.current < 0 ? 1 : Math.max(1, frame.tick - exerciseTickRef.current);
    exerciseTickRef.current = frame.tick;
    const result = advanceExercise(exerciseState, frame, BOOTCAMP_EXERCISE, tickDelta);
    setExerciseState(result.state);
    setExerciseObjectives(result.objectives);
    if (result.failure) {
      setExerciseFeedback(null);
      setSpeed(0);
      clientRef.current?.setSpeed(0);
      return;
    }
    if (result.exerciseCompleted) {
      setSpeed(0);
      clientRef.current?.setSpeed(0);
      const nextProgress: ExerciseProgress = {
        phaseIndex: result.state.phaseIndex,
        completedPhases: result.state.completedPhases,
        completed: true,
        bestTimeTicks: Math.max(600, frame.tick - exerciseState.phaseStartedTick),
      };
      setExerciseProgress(nextProgress);
      saveExerciseProgress(trainingStorage(), nextProgress);
      return;
    }
    if (result.phaseCompleted) {
      setExerciseFeedback(result.phaseCompleted.titleKey);
      for (const command of result.commands) {
        clientRef.current?.sendCommand(command);
      }
      setExerciseObjectives(objectivePlaceholders(currentPhase(result.state)));
      const nextProgress: ExerciseProgress = {
        phaseIndex: result.state.phaseIndex,
        completedPhases: result.state.completedPhases,
        completed: false,
        bestTimeTicks: exerciseProgress.bestTimeTicks,
      };
      setExerciseProgress(nextProgress);
      saveExerciseProgress(trainingStorage(), nextProgress);
    }
  }, [frame, exerciseState, sessionMode, exerciseProgress.bestTimeTicks]);
  useEffect(() => {
    if (!exerciseFeedback) {
      return;
    }
    const handle = window.setTimeout(() => setExerciseFeedback(null), 2400);
    return () => window.clearTimeout(handle);
  }, [exerciseFeedback]);
  const exercisePhase = exerciseState ? currentPhase(exerciseState) : null;
  const debrief =
    exerciseState?.completed && frame
      ? {
          timeTicks: Math.max(0, frame.tick - exerciseState.phaseStartedTick),
          ammo: frame.units
            .filter((unit) => unit.faction === 'column' && unit.squadId !== 99 && unit.alive)
            .reduce((sum, unit) => sum + unit.magazine + unit.reserve, 0),
          peakSuppression: Math.round(exerciseState.peakSuppression),
          alive: frame.units.filter(
            (unit) => unit.faction === 'column' && unit.squadId !== 99 && unit.alive && !unit.incapacitated,
          ).length,
          total: 11,
        }
      : null;
  const exerciseMarkers = useMemo(
    () =>
      exercisePhase
        ? markersForPhase(exercisePhase).map((marker) => ({
            id: marker.id,
            x: marker.point.x,
            y: marker.point.y,
            kind: marker.kind,
            radius: marker.radius,
          }))
        : [],
    [exercisePhase],
  );

  const placementPreview = useMemo<PlacementPreview | null>(() => {
    if (!sandboxTool || !placementPoint) {
      return null;
    }
    const rotation = placementRotation;
    const positions: Vec2[] = [];
    if (sandboxTool === 'enemy-troop' || sandboxTool === 'command-troop') {
      const count = sandboxTool === 'enemy-troop' ? 11 : 3;
      const columns = sandboxTool === 'enemy-troop' ? 6 : 3;
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
  }, [sandboxTool, placementPoint, placementRotation, frame?.covers, frame?.units]);
  const client = clientRef.current;

  if (!started) {
    return (
      <div className="app" data-testid="app">
        <StartScreen
          locale={locale}
          onLocaleChange={handleLocaleChange}
          onStart={handleStart}
          onToggleCodex={() => setShowCodex((open) => !open)}
        />
        {showCodex ? (
          <div className="overlay">
            <CodexPanel locale={locale} onClose={() => setShowCodex(false)} />
          </div>
        ) : null}
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="app game" data-testid="app">
      <GameCanvas
        client={client}
        postStrong={postStrong}
        cameraRequest={cameraRequest}
        preview={previewPlan}
        aimPending={aimPending}
        pendingAction={pendingOrder !== null || pendingTactical !== null || aimPending || sandboxTool !== null}
        lineMoveArmed={pendingOrder === 'move'}
        orderCallout={orderCallout}
        placementPreview={placementPreview}
        targetUnitIds={targetUnitIds}
        selectedUnitIds={selectedUnitIds}
        trainingField={sessionMode === 'training'}
        strategicField={sessionMode === 'battle'}
        trainingMarkers={exerciseMarkers}
        onCameraAction={(kind) => recordTrainingAction(`camera-${kind}` as TrainingAction)}
        onBandChange={(next) => {
          setBand(next);
        }}
        onSelectUnits={handleSelectUnits}
        onPrimaryUnit={handleAttackUnit}
        onPrimaryGround={handlePrimaryGround}
        onQuickUnit={handleQuickUnit}
        onQuickGround={handleQuickGround}
        onPrimaryLine={handlePrimaryLine}
        onQuickLine={handleQuickLine}
        onPreviewLine={handlePreviewLine}
        onPreviewGround={handlePreviewGround}
        onPreviewUnit={handlePreviewUnit}
        onHover={(kind, x, y) => {
          setCursor(x > 0 && y > 0 ? { x, y } : null);
          setHoverHint(kind ? { kind, x, y } : null);
        }}
      />
      {!hudHidden ? (
        <Hud
        locale={locale}
        frame={frame}
        band={band}
        postStrong={postStrong}
        selectedSquadId={selectedSquadId}
        controlBothSides={controlBothSides}
        ordersCollapsed={ordersCollapsed}
        previewEnabled={previewEnabled}
        selectedCount={selectedIds.length}
        speed={speed}
        outcome={frame?.outcome ?? 'playing'}
        pendingOrder={pendingOrder}
        pendingTactical={pendingTactical}
        aimPending={aimPending}
        posture={posture}
        holdFire={holdFire}
        boundingEnabled={boundingEnabled}
        battleMode={sessionMode === 'battle'}
        sandboxOpen={sandboxOpen}
        onCancelOrder={handleClearOrder}
        onClearOrder={handleClearOrder}
        onLocaleChange={handleLocaleChange}
        onActivateOrder={handleActivateOrder}
        onPosture={handlePosture}
        onHoldFire={handleHoldFire}
        onToggleBounding={handleToggleBounding}
        onSelectSquad={handleSelectSquad}
        onToggleOrders={handleToggleOrders}
        onTogglePreview={handleTogglePreview}
        onHideHud={handleHideHud}
        onCameraBand={handleCameraBand}
        onFormation={handleFormation}
        onStance={handleStance}
        onSetSpeed={handleSetSpeed}
        onTogglePause={handleTogglePause}
        onTogglePost={() => setPostStrong((value) => !value)}
        onToggleCodex={() => setShowCodex((open) => !open)}
        onToggleSandbox={handleToggleSandbox}
        audioMuted={audioMuted}
        audioVolume={audioVolume}
        onToggleAudio={handleToggleAudio}
        onAudioVolume={handleAudioVolume}
        />
      ) : null}
      {hudHidden ? (
        <button
          type="button"
          className="secondary hud-restore"
          onClick={() => setHudHidden(false)}
          data-testid="hud-restore"
        >
          <Eye aria-hidden="true" size={16} />
          {translate(locale, 'hud.showHud')}
        </button>
      ) : null}
      {!hudHidden &&
      sessionMode === 'training' &&
      exerciseState !== null &&
      exercisePhase !== null ? (
        <TrainingMissionPanel
          locale={locale}
          phase={exercisePhase}
          phaseIndex={exerciseState.phaseIndex}
          totalPhases={BOOTCAMP_EXERCISE.phases.length}
          objectives={exerciseObjectives}
          completed={exerciseState.completed}
          failed={exerciseState.failed}
          failureReason={exerciseState.failureReason}
          feedbackKey={exerciseFeedback}
          completedDrills={trainingActions}
          debrief={debrief}
          onContinue={handleMissionContinue}
          onReplay={handleMissionReplay}
          onRetry={handleRetryPhase}
        />
      ) : null}
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
      {!hudHidden && sandboxOpen ? (
        <SandboxPanel
          locale={locale}
          frame={frame}
          selectedSquadId={selectedSquadId}
          tool={sandboxTool}
          controlBothSides={controlBothSides}
          onAdvance={handleAdvance}
          onReinforce={handleReinforce}
          onToggleControlBothSides={handleToggleControlBothSides}
          onStartBattle3v3={handleStartBattle3v3}
          onClose={() => {
            setSandboxOpen(false);
            setSandboxTool(null);
          }}
          onIncapacitate={handleIncapacitate}
          onRescueCasualty={handleRescueCasualty}
          onReset={handleResetSandbox}
          onStep={handleStep}
          onTool={setSandboxTool}
        />
      ) : null}
      {showCodex ? (
        <div className="overlay">
          <CodexPanel locale={locale} onClose={() => setShowCodex(false)} />
        </div>
      ) : null}
    </div>
  );
}





















































































































