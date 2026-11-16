import { useEffect, useRef, useState } from 'react';
import { Eye } from './ui/icons';
import { CAMPAIGN_CHAPTERS, chapterText, translate, type Locale } from '@prestes/content';
import {
  authoredMapIndex,
  compileMapDocument,
  DEFAULT_BATTLE_MAP,
  forgetAuthoredMap,
  loadAuthoredMap,
  registerBattleMap,
  TRAINING_AMMUNITION,
  type BattleMapId,
  type BattleRosters,
  type Difficulty,
  type Frame,
  type MapDocument,
} from '@prestes/shared';
import { loadPlaytest } from './editor/persistence';
import type { CameraBand, SceneView } from '@prestes/view3d';
import { DEFAULT_SPEED, GameClient } from './client/GameClient';
import { FieldOverlays } from './ui/FieldOverlays';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import type { MapLayers } from './ui/hud/TopBar';
import { Compass } from './ui/hud/Compass';
import { StartScreenDesk } from './ui/menu/StartScreenDesk';
import { battleRosters, loadSetup, saveSetup, type SkirmishSetup } from './ui/menu/setupState';
import { BattleEndPanel, type CampaignEnd } from './ui/BattleEndPanel';
import { campaignStart } from './campaign/start';
import { campaignResult } from './campaign/result';
import { campaignStore } from './campaign/storage';
import { emptyProgress, nextChapter, passesChapter, recordResult, type CampaignProgress } from './campaign/progress';
import { EventCardPanel } from './ui/EventCardPanel';
import { PlaytestEventsPanel } from './ui/PlaytestEventsPanel';
import { closeEventCard, NO_EVENT_CARDS, openEventCards, type EventCardState } from './client/event-cards';
import { clearBootcampProgress, loadLocale, loadRoutesVisible, saveLocale, saveRoutesVisible } from './storage';
import { useAudio } from './hooks/useAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOrders } from './hooks/useOrders';
import { useTestBridge } from './hooks/useTestBridge';
import { isDeploymentRefusal, type DeploymentRefusal } from './ui/hud/DeploymentBanner';
import { commanderDownText, commanderView } from './ui/hud/commander';

const NO_MAP_LAYERS: MapLayers = { contours: false, cover: false };

export function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  // The language event callbacks translate in (they outlive the render that made them).
  const localeRef = useRef(locale);
  localeRef.current = locale;
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
  // make-campaign-playable D1-D3: the chapter the battle plays (held in the app,
  // never sent to the worker), the kept progress, and the chapter the book reopens at.
  const [campaignChapter, setCampaignChapter] = useState<string | null>(null);
  const campaignRef = useRef<string | null>(null);
  const recordedRef = useRef(false);
  const [progress, setProgress] = useState<CampaignProgress>(() => campaignStore().load());
  const [bookChapter, setBookChapter] = useState<string | null>(null);
  const setCampaign = (chapterId: string | null): void => {
    campaignRef.current = chapterId;
    recordedRef.current = false;
    setCampaignChapter(chapterId);
  };
  const [band, setBand] = useState<CameraBand>('tactical');
  const [cameraRequest, setCameraRequest] = useState<{ band: CameraBand; nonce: number } | null>(
    null,
  );
  const [postStrong, setPostStrong] = useState(true);
  const [routesVisible, setRoutesVisible] = useState(() => loadRoutesVisible());
  // redo-battle-hud D6: the strategic map layers, off at battle start and drawn in that band only.
  const [mapLayers, setMapLayers] = useState<MapLayers>(NO_MAP_LAYERS);
  const showMapLayers = (scene: SceneView | null): void => {
    const strategic = band === 'strategic';
    scene?.setGroundOverlay(strategic && mapLayers.contours ? 'contours' : 'none');
    scene?.setCoverMap(strategic && mapLayers.cover);
  };
  useEffect(() => showMapLayers(sceneRef.current), [band, mapLayers]);
  useEffect(() => saveRoutesVisible(routesVisible), [routesVisible]);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4 | 8>(DEFAULT_SPEED);
  // add-battle-events 3.1: the events' narrative cards; one open pauses the battle.
  const [eventCards, setEventCards] = useState<EventCardState>(NO_EVENT_CARDS);
  const speedRef = useRef<0 | 1 | 2 | 4 | 8>(DEFAULT_SPEED);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  const cardOpenRef = useRef(false);
  useEffect(() => {
    cardOpenRef.current = eventCards.cards.length > 0;
  }, [eventCards]);
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
  // add-map-compass: the battle map's true north, for the HUD compass.
  const [mapNorth, setMapNorth] = useState(0);
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
  // add-historical-commander 3.3: the line shown when the map's field commander falls.
  const [commanderNotice, setCommanderNotice] = useState<string | null>(null);
  const commanderNoticeTimer = useRef<number | null>(null);
  const showCommanderNotice = (text: string): void => {
    setCommanderNotice(text);
    if (commanderNoticeTimer.current !== null) window.clearTimeout(commanderNoticeTimer.current);
    commanderNoticeTimer.current = window.setTimeout(() => setCommanderNotice(null), 6000);
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
  /** The document a battle on this map plays (the editor's playtest copy first). */
  const mapDocumentFor = (map: BattleMapId): MapDocument | undefined =>
    playtestRef.current?.id === map ? playtestRef.current : documentsRef.current.get(map);
  const [playtest, setPlaytest] = useState(false);
  const resumeSpeed = useRef<1 | 2 | 4>(DEFAULT_SPEED);
  const cameraNonce = useRef(0);
  const selectionInitialized = useRef(false);
  const selectedCountRef = useRef(0);

  const { audioRef, audioMuted, handleToggleAudio, handleAudioView } = useAudio();
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
  const battleMapRef = useRef(battleMapId);
  battleMapRef.current = battleMapId;
  useTestBridge(clientRef, setSpeed, setControlBothSides, () => mapDocumentFor(battleMapRef.current));

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

  const createClient = (map: BattleMapId, rosters?: BattleRosters, timeLimitTicks?: number, difficulty?: Difficulty): GameClient => {
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
      ...(difficulty ? { difficulty } : {}),
      ...(playtestRef.current?.id === map
        ? // add-battle-events 4.4: the editor's playtest can fire its events by hand.
          { mapDocument: playtestRef.current, playtest: true }
        : documentsRef.current.has(map)
          ? { mapDocument: documentsRef.current.get(map)! }
          : {}),
      onEvent: (event) => {
        audioRef.current?.handleEvent(event);
        // add-deployment-phase 3.1: a refused deployment order says why, for a few seconds.
        if (event.type === 'command_rejected' && isDeploymentRefusal(event.reason)) showDeploymentRefusal(event.reason);
        else if (event.type === 'command_rejected') showOrderNotice(event.reason);
        if (event.type === 'commander_down') {
          const view = commanderView(mapDocumentFor(map)?.commander);
          if (view) showCommanderNotice(commanderDownText(event, view, (key, values) => translate(localeRef.current, key, values)));
        }
        // add-battle-events 3.1: an event's cards pause the battle until the player closes them.
        if (event.type === 'battle_event_fired' && event.cards && event.cards.length > 0) {
          const cards = event.cards.map((card) => ({ eventId: event.eventId, ...card }));
          const open = cardOpenRef.current;
          cardOpenRef.current = true;
          setEventCards((state) => openEventCards(state, cards, open ? state.resume : speedRef.current));
          client.setSpeed(0);
          setSpeed(0);
        }
      },
      onFrame: (next) => {
        // make-campaign-playable D3: a campaign battle's result is kept on its first ended frame, once.
        const chapter = campaignRef.current;
        if (chapter && !recordedRef.current && next.outcome !== 'playing') {
          recordedRef.current = true;
          const result = campaignResult(next);
          if (result) {
            const store = campaignStore();
            const updated = recordResult(store.load(), chapter, result);
            store.save(updated);
            setProgress(updated);
          }
        }
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
    setCampaign(null);
    setBookChapter(null);
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
  const handleStartBattle3v3 = (): void => {
    setCampaign(null);
    startBattle(
      battleMapId,
      battleMapId === setup.map ? battleRosters(setup) : undefined,
      battleMapId === setup.map ? setup.timeLimit : undefined,
      battleMapId === setup.map ? setup.difficulty : undefined,
    );
  };

  /**
   * make-campaign-playable D1: plays a chapter on its authored map, with the
   * map's own forces, commander, events and epilogue, and no roster screen.
   */
  const startCampaignChapter = (chapterId: string): void => {
    const start = campaignStart(chapterId);
    if (!start) return;
    setCampaign(chapterId);
    setBookChapter(null);
    setBattleMapId(start.map);
    // D6: on the dev server the map is read again, so a map saved from the editor plays at once.
    if (import.meta.env.DEV) {
      forgetAuthoredMap(start.map);
      documentsRef.current.delete(start.map);
    }
    // 5.1: the chapter starts at the level last chosen, in the skirmish setup or on a briefing.
    startBattle(start.map, start.rosters, undefined, setup.difficulty);
  };

  /** "Back to the book": the menu, with the campaign book open at the chapter's briefing. */
  const handleBackToBook = (): void => {
    const chapter = campaignChapter;
    handleBackToMenu();
    setBookChapter(chapter);
  };

  /** "Restart campaign", once the player confirmed it in the book. */
  const handleRestartCampaign = (): void => {
    campaignStore().clear();
    setProgress(emptyProgress());
  };

  const startBattle = (map: BattleMapId, rosters?: BattleRosters, timeLimitTicks?: number, difficulty?: Difficulty): void => {
    // An authored map not fetched yet: fetch it, then start (the document goes to the worker with the start).
    if (playtestRef.current?.id !== map && !documentsRef.current.has(map) && authoredMapIndex().some((entry) => entry.id === map)) {
      void loadAuthoredMap(map).then((document) => {
        if (!document) return;
        documentsRef.current.set(map, document);
        startBattle(map, rosters, timeLimitTicks, difficulty);
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
    setMapLayers(NO_MAP_LAYERS);
    setSpeed(DEFAULT_SPEED);
    setEventCards(NO_EVENT_CARDS);
    cardOpenRef.current = false;
    setStarted(true);
    createClient(map, rosters, timeLimitTicks, difficulty);
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
      setCampaign(null);
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
    // add-battle-events 3.1: the speed stays put while a card is open.
    if (cardOpenRef.current) return;
    setSpeed(next);
    clientRef.current?.setSpeed(next);
  };

  /** add-battle-events 3.1: closes the open card; after the last one the battle goes on at its speed. */
  const handleCloseEventCard = (): void => {
    const { state, resume } = closeEventCard(eventCards);
    setEventCards(state);
    if (resume === null) return;
    cardOpenRef.current = false;
    setSpeed(resume);
    clientRef.current?.setSpeed(resume);
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
          campaignProgress={progress}
          campaignChapter={bookChapter}
          onPlayChapter={startCampaignChapter}
          onRestartCampaign={handleRestartCampaign}
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

  // make-campaign-playable D5: the end panel's campaign actions.
  const campaignEnd = ((): CampaignEnd | undefined => {
    const chapter = CAMPAIGN_CHAPTERS.find((candidate) => candidate.id === campaignChapter);
    if (!chapter) return undefined;
    const won = frame?.outcome === 'victory';
    const nextId = nextChapter(chapter.id);
    // D2 amended: a victory, or any end of the prologue, leads on.
    const passed = frame ? passesChapter(chapter.id, frame.outcome) : false;
    const next = passed && nextId ? CAMPAIGN_CHAPTERS.find((candidate) => candidate.id === nextId) : undefined;
    return {
      number: chapter.number,
      title: chapterText(chapter.id, locale)?.title ?? '',
      ...(next ? { next: { id: next.id, number: next.number, title: chapterText(next.id, locale)?.title ?? '' } } : {}),
      completed: won && nextId === undefined,
    };
  })();

  // The map's epilogue (a mission's legend and record) for the end panel.
  const battleEpilogue = (playtestRef.current?.id === battleMapId ? playtestRef.current : documentsRef.current.get(battleMapId))?.epilogue;

  return (
    <div className="app game" data-testid="app" data-tick={frame?.tick ?? 0}>
      <GameCanvas
        client={client}
        deploymentAreas={deploying}
        postStrong={postStrong}
        routesVisible={routesVisible}
        onAudioView={handleAudioView}
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
          setMapNorth(scene?.mapNorth() ?? 0);
          showMapLayers(scene);
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
        mapLayers={mapLayers}
        onToggleLayer={(layer) => setMapLayers((layers) => ({ ...layers, [layer]: !layers[layer] }))}
        onStartBattle={handleStartDeployedBattle}
        onResetDeployment={handleResetDeployment}
        deploymentRefusal={deploymentRefusal}
        orderNotice={orderNotice}
        commander={commanderView(mapDocumentFor(battleMapId)?.commander)}
        commanderNotice={commanderNotice}
        onCenterSquad={handleCenterSquad}
        onLeave={handleBackToMenu}
        />
      ) : null}
      {!hudHidden ? (
        <Compass
          className="battle-compass"
          testId="battle-compass"
          north={mapNorth}
          view={() => sceneRef.current?.camera}
          letter={translate(locale, 'hud.compassLetter')}
          label={translate(locale, 'hud.compass')}
          onClick={() => sceneRef.current?.camera.faceNorth(mapNorth)}
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
      {eventCards.cards[0] ? (
        <EventCardPanel
          locale={locale}
          card={eventCards.cards[0]}
          waiting={eventCards.cards.length - 1}
          onClose={handleCloseEventCard}
        />
      ) : null}
      {playtest && frame?.battleEvents && !hudHidden ? (
        <PlaytestEventsPanel
          locale={locale}
          events={frame.battleEvents}
          onFire={(eventId) => clientRef.current?.sendCommand({ type: 'fire_battle_event', eventId })}
        />
      ) : null}
      {frame && frame.outcome !== 'playing' ? (
        <BattleEndPanel
          locale={locale}
          frame={frame}
          onRestart={campaignChapter ? () => startCampaignChapter(campaignChapter) : handleStartBattle3v3}
          onMenu={handleBackToMenu}
          {...(campaignEnd
            ? { campaign: campaignEnd, onNextChapter: startCampaignChapter, onBackToBook: handleBackToBook }
            : {})}
          {...(playtest ? { onBackToEditor: handleBackToEditor } : {})}
          {...(battleEpilogue ? { epilogue: battleEpilogue } : {})}
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
