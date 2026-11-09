import { useEffect, useRef, useState } from 'react';
import { Eye } from './ui/icons';
import { translate, type Locale } from '@prestes/content';
import {
  compileMapDocument,
  DEFAULT_BATTLE_MAP,
  registerBattleMap,
  TRAINING_AMMUNITION,
  type BattleMapId,
  type BattleRosters,
  type Frame,
  type MapDocument,
} from '@prestes/shared';
import { loadPlaytest } from './editor/persistence';
import type { CameraBand } from '@prestes/view3d';
import { DEFAULT_SPEED, GameClient } from './client/GameClient';
import { CodexPanel } from './ui/CodexPanel';
import { FieldOverlays } from './ui/FieldOverlays';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { SandboxPanel } from './ui/SandboxPanel';
import { StartScreenDesk } from './ui/menu/StartScreenDesk';
import { battleRosters, loadSetup, saveSetup, withMap, type SkirmishSetup } from './ui/menu/setupState';
import { BattleEndPanel } from './ui/BattleEndPanel';
import { clearBootcampProgress, loadLocale, loadRoutesVisible, saveLocale, saveRoutesVisible } from './storage';
import { useAudio } from './hooks/useAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOrders } from './hooks/useOrders';
import { useSandbox } from './hooks/useSandbox';
import { useTestBridge } from './hooks/useTestBridge';

export function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const [started, setStarted] = useState(false);
  // retire-bootcamp: old saved bootcamp progress is cleared once.
  useEffect(() => clearBootcampProgress(), []);
  // pre-battle-roster 5.1: the skirmish setup (map, force, enemy), saved locally.
  const [setup, setSetup] = useState<SkirmishSetup>(loadSetup);
  // add-battle-maps: the map the next 3v3 starts on (the setup's, or the editor's playtest).
  const [battleMapId, setBattleMapId] = useState<BattleMapId>(() => setup.map ?? DEFAULT_BATTLE_MAP);
  const changeSetup = (next: SkirmishSetup): void => {
    setSetup(next);
    saveSetup(next);
    setBattleMapId(next.map);
  };
  const changeBattleMap = (map: BattleMapId): void => changeSetup(withMap(setup, map));
  const [showCodex, setShowCodex] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [band, setBand] = useState<CameraBand>('tactical');
  const [cameraRequest, setCameraRequest] = useState<{ band: CameraBand; nonce: number } | null>(
    null,
  );
  const [postStrong, setPostStrong] = useState(true);
  const [routesVisible, setRoutesVisible] = useState(() => loadRoutesVisible());
  useEffect(() => saveRoutesVisible(routesVisible), [routesVisible]);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4 | 8>(DEFAULT_SPEED);
  const [ordersCollapsed, setOrdersCollapsed] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverHint, setHoverHint] = useState<{
    kind: 'cover' | 'target' | 'rescue';
    x: number;
    y: number;
  } | null>(null);

  const clientRef = useRef<GameClient | null>(null);
  // add-map-editor: the editor's map when the game was opened to playtest it.
  const playtestRef = useRef<MapDocument | null>(null);
  const [playtest, setPlaytest] = useState(false);
  const resumeSpeed = useRef<1 | 2 | 4>(DEFAULT_SPEED);
  const cameraNonce = useRef(0);
  const selectionInitialized = useRef(false);
  const selectedCountRef = useRef(0);

  const { audioRef, audioMuted, audioVolume, handleToggleAudio, handleAudioVolume } = useAudio();
  const {
    sandboxOpen,
    setSandboxOpen,
    sandboxTool,
    setSandboxTool,
    setPlacementPoint,
    placementRotation,
    controlBothSides,
    setControlBothSides,
    placementPreview,
    troopSection,
    setTroopSection,
  } = useSandbox(frame);
  const {
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
    fireControl,
    posture,
    needsTarget,
    previewPlan,
    slotView,
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
  } = useOrders({
    frame,
    locale,
    clientRef,
    speed,
    hudHidden,
    controlBothSides,
    setControlBothSides,
    sandboxTool,
    troopSection,
    placementPreview,
    placementRotation,
    setPlacementPoint,
  });
  selectedCountRef.current = selectedIds.length;
  useKeyboardShortcuts({
    controlBothSides,
    selectedSquadId,
    sandboxTool,
    setHudHidden,
    setSandboxOpen,
    setSandboxTool,
    setPendingOrder,
    setPendingTactical,
    setAimPending,
    onRegroup: handleRegroup,
  });
  useTestBridge(clientRef, setSpeed);

  // The player's last order, shown over his officer.
  const [callout, setCallout] = useState<typeof orderCallout>(null);
  useEffect(() => setCallout(orderCallout), [orderCallout]);
  // fog-of-war: controlling both sides shows both sides.
  useEffect(() => clientRef.current?.setFogView(!controlBothSides), [controlBothSides, frame === null]);

  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const handleLocaleChange = (next: Locale): void => {
    setLocale(next);
    saveLocale(next);
  };

  const createClient = (map: BattleMapId, rosters?: BattleRosters): GameClient => {
    const client = new GameClient({
      seed: 1922,
      sandbox: true,
      training: false,
      opposition: true,
      scenario: 'battle3v3',
      battleMap: map,
      ...(rosters ? { rosters } : {}),
      ...(playtestRef.current?.id === map ? { mapDocument: playtestRef.current } : {}),
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
    client.setSpeed(DEFAULT_SPEED);
    client.start();
    clientRef.current = client;
    return client;
  };

  /** Leaves the battle for the main menu. */
  const handleBackToMenu = (): void => {
    clientRef.current?.dispose();
    clientRef.current = null;
    setFrame(null);
    setSelectedUnitIds([]);
    setSandboxOpen(false);
    setSandboxTool(null);
    setSpeed(DEFAULT_SPEED);
    setStarted(false);
  };

  // The setup's forces go with its map; the editor's playtest map fields the default.
  const handleStartBattle3v3 = (): void => startBattle(battleMapId, battleMapId === setup.map ? battleRosters(setup) : undefined);

  const startBattle = (map: BattleMapId, rosters?: BattleRosters): void => {
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
    setSpeed(DEFAULT_SPEED);
    setStarted(true);
    createClient(map, rosters);
  };

  // add-map-editor: `?playtest` starts the editor's map straight away.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('playtest')) return;
    let cancelled = false;
    void loadPlaytest().then((document) => {
      if (cancelled || !document) return;
      try {
        registerBattleMap(compileMapDocument(document));
      } catch (error) {
        console.error('playtest map could not be compiled', error);
        return;
      }
      playtestRef.current = document;
      setPlaytest(true);
      setBattleMapId(document.id);
      startBattle(document.id);
    });
    return () => {
      cancelled = true;
    };
    // Once, on load.
  }, []);

  const handleBackToEditor = (): void => {
    window.location.href = './editor.html';
  };
  const handleResetSandbox = (): void => {
    clientRef.current?.reset();
    setFrame(null);
    selectionInitialized.current = false;
    setSelectedUnitIds([]);
    setSpeed(DEFAULT_SPEED);
    clientRef.current?.setSpeed(DEFAULT_SPEED);
    setSandboxTool(null);
  };

  const handleSetSpeed = (next: 0 | 1 | 2 | 4 | 8): void => {
    setSpeed(next);
    clientRef.current?.setSpeed(next);
  };

  const handleTogglePause = (): void => {
    handleSetSpeed(speed === 0 ? resumeSpeed.current : 0);
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

  const handleHideHud = (): void => {
    setHudHidden(true);
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

  const handleReinforce = (faction: 'column' | 'legalist'): void => {
    clientRef.current?.sendCommand({ type: 'reinforce', faction });
    if (speed === 0) {
      clientRef.current?.step(1);
    }
  };

  const client = clientRef.current;

  if (!started) {
    return (
      <div className="app" data-testid="app">
        <StartScreenDesk
          locale={locale}
          onLocaleChange={handleLocaleChange}
          audioMuted={audioMuted}
          onStartBattle3v3={handleStartBattle3v3}
          setup={setup}
          onSetupChange={changeSetup}
          onToggleAudio={handleToggleAudio}
        />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="app game" data-testid="app" data-tick={frame?.tick ?? 0}>
      <GameCanvas
        client={client}
        postStrong={postStrong}
        routesVisible={routesVisible}
        onAudioView={(listener) => audioRef.current?.setListener(listener)}
        cameraRequest={cameraRequest}
        preview={previewPlan}
        slotMarkers={slotView?.markers}
        aimPending={aimPending}
        pendingAction={pendingOrder !== null || pendingTactical !== null || aimPending || sandboxTool !== null}
        lineMoveArmed={pendingOrder === 'move'}
        locale={locale}
        groundOrderArmed={
          pendingOrder === 'move' ||
          (pendingTactical !== null &&
            ['advance', 'defend', 'ambush', 'disperse', 'recon', 'reserve'].includes(pendingTactical))
        }
        orderCallout={callout}
        placementPreview={placementPreview}
        targetUnitIds={targetUnitIds}
        selectedUnitIds={selectedUnitIds}
        strategicField
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
        onPreviewFacing={handlePreviewFacing}
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
        selectedUnitIds={selectedIds}
        // The 3v3 is a training battle: both sides carry the depot issue.
        ammoFull={TRAINING_AMMUNITION.magazine + TRAINING_AMMUNITION.reserve}
        speed={speed}
        pendingOrder={pendingOrder}
        pendingTactical={pendingTactical}
        aimPending={aimPending}
        posture={posture}
        fireControl={fireControl}
        battleMode
        sandboxOpen={sandboxOpen}
        onCancelOrder={handleClearOrder}
        onLocaleChange={handleLocaleChange}
        onActivateOrder={handleActivateOrder}
        onPosture={handlePosture}
        onFireControl={handleFireControl}
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
        routesVisible={routesVisible}
        onToggleRoutes={() => setRoutesVisible((value) => !value)}
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
      <FieldOverlays
        locale={locale}
        needsTarget={needsTarget}
        hoverUnitId={hoverUnitId}
        cursor={cursor}
        placementPreview={placementPreview}
        hoverHint={hoverHint}
        slotView={slotView}
      />
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
          onToggleFog={() => clientRef.current?.sendCommand({ type: 'fog', enabled: frame?.fog !== true })}
          onStartBattle3v3={handleStartBattle3v3}
          battleMap={battleMapId}
          onBattleMapChange={changeBattleMap}
          onClose={() => {
            setSandboxOpen(false);
            setSandboxTool(null);
          }}
          onIncapacitate={handleIncapacitate}
          onRescueCasualty={handleRescueCasualty}
          onReset={handleResetSandbox}
          onStep={handleStep}
          onTool={setSandboxTool}
          troopSection={troopSection}
          onTroopSection={setTroopSection}
        />
      ) : null}
      {showCodex ? (
        <div className="overlay">
          <CodexPanel locale={locale} onClose={() => setShowCodex(false)} />
        </div>
      ) : null}
      {frame && frame.outcome !== 'playing' ? (
        <BattleEndPanel
          locale={locale}
          frame={frame}
          onRestart={handleStartBattle3v3}
          onMenu={handleBackToMenu}
          {...(playtest ? { onBackToEditor: handleBackToEditor } : {})}
        />
      ) : null}
      {playtest && !hudHidden ? (
        <button type="button" className="secondary playtest-back" onClick={handleBackToEditor} data-testid="playtest-back">
          {translate(locale, 'battle.end.backToEditor')}
        </button>
      ) : null}
    </div>
  );
}
