import { useEffect, useRef, useState } from 'react';
import { Eye } from './ui/icons';
import { translate, type Locale } from '@prestes/content';
import {
  authoredMapIndex,
  compileMapDocument,
  DEFAULT_BATTLE_MAP,
  loadAuthoredMap,
  registerBattleMap,
  TRAINING_AMMUNITION,
  type BattleMapId,
  type BattleRosters,
  type Frame,
  type MapDocument,
} from '@prestes/shared';
import { loadPlaytest } from './editor/persistence';
import type { CameraBand, SceneView } from '@prestes/view3d';
import { DEFAULT_SPEED, GameClient } from './client/GameClient';
import { FieldOverlays } from './ui/FieldOverlays';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { StartScreenDesk } from './ui/menu/StartScreenDesk';
import { battleRosters, loadSetup, saveSetup, type SkirmishSetup } from './ui/menu/setupState';
import { BattleEndPanel } from './ui/BattleEndPanel';
import { clearBootcampProgress, loadLocale, loadRoutesVisible, saveLocale, saveRoutesVisible } from './storage';
import { useAudio } from './hooks/useAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOrders } from './hooks/useOrders';
import { useTestBridge } from './hooks/useTestBridge';
import { isDeploymentRefusal, type DeploymentRefusal } from './ui/hud/DeploymentBanner';

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
  const [frame, setFrame] = useState<Frame | null>(null);
  const [band, setBand] = useState<CameraBand>('tactical');
  const [cameraRequest, setCameraRequest] = useState<{ band: CameraBand; nonce: number } | null>(
    null,
  );
  const [postStrong, setPostStrong] = useState(true);
  const [routesVisible, setRoutesVisible] = useState(() => loadRoutesVisible());
  useEffect(() => saveRoutesVisible(routesVisible), [routesVisible]);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4 | 8>(DEFAULT_SPEED);
  const [hudHidden, setHudHidden] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverHint, setHoverHint] = useState<{
    kind: 'cover' | 'target' | 'rescue';
    x: number;
    y: number;
  } | null>(null);

  const clientRef = useRef<GameClient | null>(null);
  // refine-battle-controls: the battle scene, for the HUD's centring control.
  const sceneRef = useRef<SceneView | null>(null);
  // add-deployment-phase 3.1: the latest refused deployment order, shown for a few seconds.
  const [deploymentRefusal, setDeploymentRefusal] = useState<DeploymentRefusal | null>(null);
  const refusalTimer = useRef<number | null>(null);
  // refine-battle-controls: a refused battle order (for example a full queue), shown briefly.
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const orderNoticeTimer = useRef<number | null>(null);
  const showOrderNotice = (reason: string): void => {
    setOrderNotice(reason);
    if (orderNoticeTimer.current !== null) window.clearTimeout(orderNoticeTimer.current);
    orderNoticeTimer.current = window.setTimeout(() => setOrderNotice(null), 3000);
  };
  const showDeploymentRefusal = (reason: DeploymentRefusal): void => {
    setDeploymentRefusal(reason);
    if (refusalTimer.current !== null) window.clearTimeout(refusalTimer.current);
    refusalTimer.current = window.setTimeout(() => setDeploymentRefusal(null), 3500);
  };
  const deploying = frame?.phase === 'deployment';
  const handleStartDeployedBattle = (): void => {
    setDeploymentRefusal(null);
    clientRef.current?.sendCommand({ type: 'start_battle' });
  };
  const handleResetDeployment = (): void => {
    setDeploymentRefusal(null);
    clientRef.current?.sendCommand({ type: 'reset_deployment' });
  };
  // Enter starts the battle, unless a field or a button has the keys.
  useEffect(() => {
    if (!deploying) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      event.preventDefault();
      handleStartDeployedBattle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deploying]);
  // add-map-editor: the editor's map when the game was opened to playtest it.
  const playtestRef = useRef<MapDocument | null>(null);
  // author-game-maps D2: authored maps are fetched when a battle asks for them, then sent to the worker.
  const documentsRef = useRef(new Map<BattleMapId, MapDocument>());
  const [playtest, setPlaytest] = useState(false);
  const resumeSpeed = useRef<1 | 2 | 4>(DEFAULT_SPEED);
  const cameraNonce = useRef(0);
  const selectionInitialized = useRef(false);
  const selectedCountRef = useRef(0);

  const { audioRef, audioMuted, handleToggleAudio } = useAudio();
  // machine-gun-fire-feedback 4.2: a burst's rounds keep their spacing at the game speed.
  useEffect(() => audioRef.current?.setSpeed(speed), [audioRef, speed]);
  // remove-sandbox-panel D1: both-sides control, set only by tests through the bridge.
  const [controlBothSides, setControlBothSides] = useState(false);
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
    setPreviewEnabled,
    hoverUnitId,
    targetUnitIds,
    selectedIds,
    fireControl,
    posture,
    needsTarget,
    previewPlan,
    slotView,
    exitRing,
    deploymentSlots,
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
  } = useOrders({
    frame,
    locale,
    clientRef,
    hudHidden,
    controlBothSides,
  });
  selectedCountRef.current = selectedIds.length;
  useKeyboardShortcuts({
    controlBothSides,
    selectedSquadId,
    setHudHidden,
    setPendingOrder,
    setPendingTactical,
    setAimPending,
    onRegroup: handleRegroup,
    onToggleHurry: () => handleHurry(!hurry),
  });
  useTestBridge(clientRef, setSpeed, setControlBothSides);

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

  const createClient = (map: BattleMapId, rosters?: BattleRosters, timeLimitTicks?: number): GameClient => {
    const client = new GameClient({
      seed: 1922,
      sandbox: true,
      training: false,
      opposition: true,
      scenario: 'battle3v3',
      battleMap: map,
      // add-deployment-phase: every skirmish (and the editor's playtest) opens in deployment.
      deployment: true,
      ...(rosters ? { rosters } : {}),
      ...(timeLimitTicks === undefined ? {} : { timeLimitTicks }),
      ...(playtestRef.current?.id === map
        ? { mapDocument: playtestRef.current }
        : documentsRef.current.has(map)
          ? { mapDocument: documentsRef.current.get(map)! }
          : {}),
      onEvent: (event) => {
        audioRef.current?.handleEvent(event);
        // add-deployment-phase 3.1: a refused deployment order says why, for a few seconds.
        if (event.type === 'command_rejected' && isDeploymentRefusal(event.reason)) showDeploymentRefusal(event.reason);
        else if (event.type === 'command_rejected') showOrderNotice(event.reason);
      },
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
    setSpeed(DEFAULT_SPEED);
    setStarted(false);
  };

  /** refine-battle-controls: centres the view on a section, keeping the zoom band. */
  const handleCenterSquad = (squadId: number): void => {
    const units = frame?.units.filter((unit) => unit.squadId === squadId && unit.alive && !unit.routed) ?? [];
    if (units.length === 0) return;
    const x = units.reduce((sum, unit) => sum + unit.x, 0) / units.length;
    const y = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
    sceneRef.current?.focusOn(x, y);
  };

  // The setup's forces go with its map; the editor's playtest map fields the default.
  const handleStartBattle3v3 = (): void =>
    startBattle(battleMapId, battleMapId === setup.map ? battleRosters(setup) : undefined, battleMapId === setup.map ? setup.timeLimit : undefined);

  // author-game-maps 5.3: a campaign chapter's map plays the 3 vs 3 with the default forces.
  const handlePlayMap = (map: BattleMapId): void => {
    setBattleMapId(map);
    startBattle(map);
  };

  const startBattle = (map: BattleMapId, rosters?: BattleRosters, timeLimitTicks?: number): void => {
    // An authored map not fetched yet: fetch it, then start (the document goes to the worker with the start).
    if (playtestRef.current?.id !== map && !documentsRef.current.has(map) && authoredMapIndex().some((entry) => entry.id === map)) {
      void loadAuthoredMap(map).then((document) => {
        if (!document) return;
        documentsRef.current.set(map, document);
        startBattle(map, rosters, timeLimitTicks);
      });
      return;
    }
    void audioRef.current?.unlock();
    clientRef.current?.dispose();
    clientRef.current = null;
    setFrame(null);
    selectionInitialized.current = false;
    setSelectedUnitIds([]);
    setSelectedSquadId(1);
    setControlBothSides(false);
    setPendingOrder(null);
    setPendingTactical(null);
    setAimPending(false);
    setPreviewEnabled(false);
    setSpeed(DEFAULT_SPEED);
    setStarted(true);
    createClient(map, rosters, timeLimitTicks);
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

  const handleSetSpeed = (next: 0 | 1 | 2 | 4 | 8): void => {
    setSpeed(next);
    clientRef.current?.setSpeed(next);
  };

  const handleTogglePause = (): void => {
    handleSetSpeed(speed === 0 ? resumeSpeed.current : 0);
  };

  const handleCameraBand = (next: CameraBand): void => {
    cameraNonce.current += 1;
    setCameraRequest({ band: next, nonce: cameraNonce.current });
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
          onPlayMap={handlePlayMap}
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
        deploymentAreas={deploying}
        postStrong={postStrong}
        routesVisible={routesVisible}
        onAudioView={(listener) => audioRef.current?.setListener(listener)}
        cameraRequest={cameraRequest}
        preview={previewPlan}
        slotMarkers={deploymentSlots?.markers ?? slotView?.markers}
        slotBadges={deploymentSlots?.pieces.map((piece) => ({ x: piece.at.x, y: piece.at.y, text: `${piece.free}/${piece.total}` }))}
        aimPending={aimPending}
        pendingAction={pendingOrder !== null || pendingTactical !== null || aimPending}
        lineMoveArmed={pendingOrder === 'move'}
        locale={locale}
        groundOrderArmed={
          pendingOrder === 'move' ||
          (pendingTactical !== null &&
            ['advance', 'defend', 'ambush', 'disperse', 'recon', 'reserve', 'enter', 'exit', 'assault'].includes(pendingTactical))
        }
        orderCallout={callout}
        rangeRing={exitRing}
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
        onSceneReady={(scene) => {
          sceneRef.current = scene;
        }}
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
        onCancelOrder={handleClearOrder}
        onLocaleChange={handleLocaleChange}
        onActivateOrder={handleActivateOrder}
        onPosture={handlePosture}
        onFireControl={handleFireControl}
        onSelectSquad={handleSelectSquad}
        onCameraBand={handleCameraBand}
        onFormation={handleFormation}
        onStance={handleStance}
        hurry={hurry}
        onHurry={handleHurry}
        onSetSpeed={handleSetSpeed}
        onTogglePause={handleTogglePause}
        onTogglePost={() => setPostStrong((value) => !value)}
        routesVisible={routesVisible}
        onToggleRoutes={() => setRoutesVisible((value) => !value)}
        onStartBattle={handleStartDeployedBattle}
        onResetDeployment={handleResetDeployment}
        deploymentRefusal={deploymentRefusal}
        orderNotice={orderNotice}
        onCenterSquad={handleCenterSquad}
        onLeave={handleBackToMenu}
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
        hoverHint={hoverHint}
        slotView={slotView}
      />
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
