import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import {
  BIOME_MIX,
  CATALOG_OBJECTS,
  catalogObject,
  FLORA_BIOMES,
  speciesForms,
  PROTECTION_CLASSES,
  type CoverPiece,
  TREE_BIOMES,
  TREE_DENSITIES,
  treeSpecies,
  type TreeBiome,
  type TreeDensity,
  createEditableMap,
  fromMapDocument,
  GROUND_ATLAS,
  GROUND_MATERIAL_IDS,
  groundMaterial,
  groundMaterialIndex,
  isValidMapId,
  LINE_KINDS,
  lineKind as lineKindEntry,
  MAP_SIZES,
  resizeEditableMap,
  ROAD_TYPES,
  roadType,
  solidBlocksSight,
  solidQuality,
  surfaceSpeed,
  toMapDocument,
  validateEditableMap,
  PAINTED_VEGETATION_KINDS,
  isListed,
  type CatalogObject,
  type ObjectGroup,
  type EditableMap,
  type GroundMaterialId,
  type LineKind,
  trenchLength,
  trenchSlotCount,
  type TrenchDepth,
  type TrenchFacing,
  type TrenchKind,
  type TrenchParapet,
  type MapPalette,
  type MapProblem,
  type Objective,
  type ObjectiveOwner,
  type MapSize,
  type MapUse,
  type PositionDef,
  type AuthoredMapEntry,
  type RoadType,
  type Roster,
  type SettingLabel,
  DEFAULT_MAP_LIGHT,
  VEGETATION_DENSITIES,
  MAP_LIGHT_TIME,
  mapLight,
  mapNorth,
  type MapLight,
  buildingVariants,
  ROCK_KINDS,
  takesRockKind,
  CAMP_SIDES,
  SIDED_CAMP,
  type RockKind,
  ROSTER_MAX_SECTIONS,
} from '@prestes/shared';
import { renameExit } from './exits';
import { LOCALES, translate, type Locale, type MessageKey } from '@prestes/content';
import { loadLocale, saveLocale } from '../storage';
import { autosave, exportDocument, listProjectMaps, loadLast, loadProjectMap, readDocumentFile, saveThumbnail, saveToProject, storePlaytest } from './persistence';
import { missionLabel, OpenDialog, slotOf, SlotSelect, type Slot } from './MapSlots';
import { EditorStore, objectiveCircle, replaceCommand, type SelectionItem, type ToolId, type ToolSettings } from './store';
import { editorBridge, type EditorBridge } from './test-bridge';
import { EditorViewport, PROTECTION_COLORS, type CursorInfo } from './viewport';
import { useThumbnails } from './thumbnails';
import { EnemyForces } from './EnemyForces';
import { ColumnForce } from './ColumnForce';
// add-battle-events 4.3: the Events panel loads when first opened (the editor chunk stays in its budget).
const EventsPanel = lazy(() => import('./EventsPanel').then((module) => ({ default: module.EventsPanel })));
import { Compass } from '../ui/hud/Compass';

/**
 * The map editor page (add-map-editor): toolbar, tool palette, properties,
 * problems and status bar around the 3D viewport. Every string goes through
 * the locale catalog.
 */

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

/**
 * The erasers are modes of the trees and vegetation tools (trees: erase;
 * vegetation: clear), given their own buttons so they are found.
 */
type PaletteEntry = ToolId | 'eraseTrees' | 'eraseVegetation';

const TOOL_GROUPS: readonly { layer: string; tools: readonly PaletteEntry[] }[] = [
  { layer: 'editor.layers', tools: ['select'] },
  { layer: 'editor.layer.paint', tools: ['paint', 'fill', 'erase'] },
  { layer: 'editor.layer.terrain', tools: ['raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise'] },
  { layer: 'editor.layer.roads', tools: ['road'] },
  { layer: 'editor.layer.water', tools: ['river', 'pond', 'bridge', 'ferry'] },
  { layer: 'editor.layer.structures', tools: ['line', 'trench'] },
  { layer: 'editor.layer.objects', tools: ['place', 'trees', 'eraseTrees'] },
  { layer: 'editor.layer.vegetation', tools: ['vegetation', 'eraseVegetation'] },
  { layer: 'editor.layer.gameplay', tools: ['deployment', 'objective', 'exit', 'entry-point', 'event-area'] },
];

/**
 * Tool shortcuts. W, A, S, D move the camera and Q, E turn it, as in the
 * battle, so no tool takes them (hand check 2026-11-09).
 */
const TOOL_KEYS: Record<ToolId, string> = {
  select: 'V',
  paint: 'B',
  fill: 'G',
  erase: 'C',
  raise: 'H',
  lower: '',
  smooth: 'M',
  flatten: 'F',
  setHeight: '',
  noise: '',
  road: 'R',
  river: '',
  pond: '',
  bridge: '',
  ferry: '',
  line: 'L',
  trench: 'T',
  place: 'O',
  trees: 'Y',
  vegetation: 'P',
  deployment: 'K',
  objective: 'J',
  'entry-point': '',
  'event-area': '',
  exit: '',
};

const OBJECT_GROUPS = ['building', 'stone', 'water', 'camp', 'tree', 'post', 'cover', 'prop', 'decal'] as const;
/** revise-buildings-and-stone D9: the props' sub-headings, in order; the older props come first, unheaded. */
const PROP_SUBGROUPS = [undefined, 'farm', 'town', 'gate'] as const;
const PALETTES: readonly MapPalette[] = ['temperate', 'cerrado', 'caatinga', 'urban'];
const SETTINGS: readonly SettingLabel[] = ['historical-setting-fictional-place', 'reconstructed-historical-place', 'training-ground'];
const AUTOSAVE_DELAY = 1500;

/** The vegetation kind the vegetation tool goes back to after the eraser. */
let lastVegetation = 2;

function paletteActive(entry: PaletteEntry, tool: ToolId, settings: ToolSettings): boolean {
  if (entry === 'eraseTrees') return tool === 'trees' && settings.treeMode === 'erase';
  if (entry === 'eraseVegetation') return tool === 'vegetation' && settings.vegetation === 0;
  if (entry === 'trees') return tool === 'trees' && settings.treeMode !== 'erase';
  if (entry === 'vegetation') return tool === 'vegetation' && settings.vegetation !== 0;
  return tool === entry;
}

function choosePaletteEntry(store: EditorStore, entry: PaletteEntry): void {
  const { settings } = store;
  if (settings.vegetation !== 0) lastVegetation = settings.vegetation;
  if (entry === 'eraseTrees') store.updateSettings({ treeMode: 'erase' });
  else if (entry === 'trees' && settings.treeMode === 'erase') store.updateSettings({ treeMode: 'scatter' });
  else if (entry === 'eraseVegetation') store.updateSettings({ vegetation: 0 });
  else if (entry === 'vegetation' && settings.vegetation === 0) store.updateSettings({ vegetation: lastVegetation });
  store.setTool(entry === 'eraseTrees' ? 'trees' : entry === 'eraseVegetation' ? 'vegetation' : entry);
}

function hintKey(tool: ToolId): string {
  if (tool === 'paint' || tool === 'erase' || tool === 'fill' || tool === 'vegetation') return 'editor.tool.hint.paint';
  if (['raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise'].includes(tool)) return 'editor.tool.hint.height';
  if (tool === 'trench') return 'editor.tool.hint.trench';
  if (['road', 'river', 'pond', 'line', 'bridge', 'ferry'].includes(tool)) return 'editor.tool.hint.polyline';
  if (tool === 'place') return 'editor.tool.hint.place';
  if (tool === 'trees') return 'editor.tool.hint.trees';
  if (tool === 'deployment') return 'editor.tool.hint.deployment';
  if (tool === 'objective') return 'editor.tool.hint.objective';
  if (tool === 'entry-point') return 'editor.tool.hint.entry-point';
  if (tool === 'event-area') return 'editor.tool.hint.event-area';
  if (tool === 'exit') return 'editor.tool.hint.exit';
  return 'editor.tool.hint.select';
}

/** What an object does in battle, as the properties panel shows it. */
export function footprintFacts(entry: CatalogObject, t: T): string[] {
  const facts: string[] = [];
  const footprint = entry.footprint;
  switch (footprint.kind) {
    case 'building':
      facts.push(t('editor.prop.blocksMovement'), t('editor.prop.blocksSight'), t('editor.prop.cover', { quality: '0.80' }));
      break;
    case 'solid':
      facts.push(t('editor.prop.blocksMovement'), t('editor.prop.cover', { quality: solidQuality(entry.height).toFixed(2) }));
      facts.push(solidBlocksSight(entry.height, entry.halfWidth, entry.halfDepth) ? t('editor.prop.blocksSight') : t('editor.prop.seeThrough'));
      break;
    case 'thin':
      facts.push(t('editor.prop.blocksMovement'), t('editor.prop.noCover'), t('editor.prop.seeThrough'));
      break;
    case 'open':
      // revise-buildings-and-stone 5.3: a gate standing open.
      facts.push(t('editor.prop.walkThrough'), t('editor.prop.noCover'));
      break;
    case 'enclosure':
      // revise-buildings-and-stone 4.2: a corral's walls cover as dry stone wall lines.
      facts.push(t('editor.prop.blocksMovement'), t('editor.prop.cover', { quality: (entry.height >= 1.2 ? 0.4 : 0.35).toFixed(2) }), t('editor.prop.seeThrough'));
      break;
    case 'foliage':
      facts.push(t('editor.prop.conceals'), t('editor.prop.noCover'));
      break;
    case 'decal':
      facts.push(t('editor.prop.flat'), t('editor.prop.surface', { speed: surfaceSpeed(groundMaterial(groundMaterialIndex(footprint.material)).surface).toFixed(2) }));
      break;
  }
  if (entry.concealRadius) facts.push(t('editor.prop.conceals'));
  return facts;
}

function problemText(problem: MapProblem, t: T): string {
  const params: Record<string, string | number> = { ...problem.params };
  if (typeof params.side === 'string') params.side = t(`editor.side.${params.side}`);
  for (const key of ['type', 'a', 'b'] as const) {
    if (typeof params[key] === 'string' && catalogObject(params[key] as string)) params[key] = t(`editor.object.${params[key] as string}`);
  }
  if (params.language === 'en') params.language = 'English';
  if (params.language === 'pt-BR') params.language = 'Português';
  return t(`editor.problem.${problem.code}`, params);
}

function problemSelection(problem: MapProblem): SelectionItem[] {
  const target = problem.target;
  if (!target) return [];
  if (target.kind === 'section') {
    const [side, index] = String(target.id).split(':');
    if (side === 'column' || side === 'legalist') return [{ kind: 'section', side, index: Number(index) }];
    return [];
  }
  if (target.kind === 'area') return target.id === 'column' || target.id === 'legalist' ? [{ kind: 'area', side: target.id }] : [];
  // add-withdrawal-exits 6.2: a requirement problem opens Map properties (chooseProblem), nothing to select.
  if (target.kind === 'map-properties') return [];
  if (typeof target.id !== 'number') return [];
  return [{ kind: target.kind, id: target.id }];
}

export function EditorApp(): ReactNode {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const t: T = useMemo(() => (key, values) => translate(locale, key as MessageKey, values), [locale]);
  const store = useMemo(() => new EditorStore(), []);
  useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.version,
  );
  const container = useRef<HTMLDivElement | null>(null);
  const viewport = useRef<EditorViewport | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [cursor, setCursor] = useState<CursorInfo | null>(null);
  const [dialog, setDialog] = useState<'new' | 'properties' | 'open' | null>(null);
  // add-map-compass: the north the properties dialog is previewing (null: the map's own).
  const [previewNorth, setPreviewNorth] = useState<number | null>(null);
  // The editor's camera turns with Q and E too: the arrow follows it.
  const editorCamera = useMemo(() => () => viewport.current?.view.camera, []);
  // author-game-maps 4.1, 4.2: the project's maps, fetched when a dialog that shows slots opens.
  const [projectMaps, setProjectMaps] = useState<AuthoredMapEntry[] | null>(null);
  const openDialog = (next: 'new' | 'properties' | 'open'): void => {
    setProjectMaps(null);
    setDialog(next);
    void listProjectMaps().then(setProjectMaps);
  };
  const [ready, setReady] = useState(false);
  const tRef = useRef(t);
  tRef.current = t;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  // The viewport lives outside React.
  useEffect(() => {
    if (!container.current) return undefined;
    const view = new EditorViewport(
      container.current,
      store,
      (side, index) => `${tRef.current(`editor.side.${side}`)} · ${tRef.current('editor.section', { n: index + 1 })}`,
      () => ({
        heading: (length) => tRef.current('editor.scale.heading', { length }),
        metres: (value) => tRef.current('editor.scale.metres', { value }),
      }),
    );
    view.onCursor = setCursor;
    // add-battle-events 4.1: new places are named in the editor's language; deleting a used one asks first.
    view.placeName = (kind, id) => tRef.current(`editor.event.place.${kind}`, { n: id });
    view.exitName = (n) => tRef.current('editor.exit.defaultName', { n });
    view.exitLabel = (exit) => (localeRef.current === 'pt-BR' ? exit.name['pt-BR'] || exit.name.en : exit.name.en || exit.name['pt-BR']);
    view.confirmPlaceDelete = (users) => window.confirm(tRef.current('editor.event.place.confirmDelete', { events: users.join(', ') }));
    viewport.current = view;
    let cancelled = false;
    void loadLast().then((document) => {
      if (cancelled) return;
      if (document) {
        store.load(fromMapDocument(document));
        view.frameMap();
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
      view.dispose();
      viewport.current = null;
    };
  }, [store]);

  // Dev-only `window.__prestesEditor` bridge for the Playwright suite.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const host = window as unknown as { __prestesEditor?: EditorBridge };
    host.__prestesEditor = editorBridge(store, () => viewport.current);
    return () => {
      delete host.__prestesEditor;
    };
  }, [store]);

  // Autosave a moment after the last edit.
  useEffect(() => {
    let timer = 0;
    store.onEdited = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void autosave(toMapDocument(store.map)).then((saved) => {
          if (saved && store.saveState === 'unsaved') {
            store.saveState = 'autosaved';
            store.emit();
          }
        });
      }, AUTOSAVE_DELAY);
    };
    return () => {
      window.clearTimeout(timer);
      store.onEdited = null;
    };
  }, [store]);

  // Tool shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (store.tool === 'place' && event.code === 'KeyR') return;
      const letter = event.key.toUpperCase();
      const tool = (Object.keys(TOOL_KEYS) as ToolId[]).find((id) => TOOL_KEYS[id] === letter);
      if (tool) store.setTool(tool);
      if (event.key === '[') store.updateSettings({ size: Math.max(1, store.settings.size - 1) });
      if (event.key === ']') store.updateSettings({ size: Math.min(64, store.settings.size + 1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);

  const changeLocale = (next: Locale): void => {
    setLocale(next);
    saveLocale(next);
  };

  const runValidation = (): MapProblem[] => {
    store.problems = validateEditableMap(store.map);
    store.emit();
    return store.problems;
  };

  const onImport = async (file: File): Promise<void> => {
    const result = await readDocumentFile(file);
    if (!result.ok) {
      store.setMessage(t(`editor.import.error.${result.error}`, { detail: result.detail ?? '' }), true);
      return;
    }
    store.execute(replaceCommand(store.map, fromMapDocument(result.document)));
    viewport.current?.frameMap();
    store.setMessage(null);
  };

  // author-game-maps: the view as framed (position and zoom) becomes the saved map's thumbnail on the desk.
  const onSaveThumbnail = async (): Promise<void> => {
    const picture = viewport.current?.snapshot();
    if (!picture) return;
    const result = await saveThumbnail(store.map.id, picture);
    if (result.ok) store.setMessage(t('editor.thumbnail.ok', { file: result.file }));
    else store.setMessage(t(result.reason === 'save-first' ? 'editor.thumbnail.saveFirst' : 'editor.save.failed', { reason: result.reason }), true);
  };

  const onSaveToProject = async (): Promise<void> => {
    const problems = runValidation();
    if (problems.some((problem) => problem.severity === 'error')) {
      store.setMessage(t('editor.save.refused'), true);
      return;
    }
    const document = toMapDocument(store.map);
    let result = await saveToProject(document);
    // author-game-maps 4.1: one map per mission; replacing asks first.
    if (!result.ok && result.reason === 'mission-taken' && document.mission) {
      if (!window.confirm(t('editor.save.replaceMission', { mission: missionLabel(document.mission, locale), holder: result.holder ?? '' }))) {
        store.setMessage(t('editor.save.kept'), true);
        return;
      }
      result = await saveToProject(document, true);
    }
    if (result.ok) {
      store.saveState = 'saved';
      store.setMessage(result.moved ? t('editor.save.moved', { file: result.file, holder: result.moved }) : t('editor.save.ok', { file: result.file }));
    } else {
      store.setMessage(t('editor.save.failed', { reason: result.reason }), true);
    }
  };

  const onPlaytest = async (): Promise<void> => {
    const problems = runValidation();
    if (problems.some((problem) => problem.severity === 'error')) return;
    const document = toMapDocument(store.map);
    // Saved first: "back to the editor" reopens this map, not an older autosave.
    await autosave(document);
    await storePlaytest(document);
    window.location.href = './index.html?playtest=1';
  };

  const onOpenProjectMap = async (id: string): Promise<void> => {
    const result = await loadProjectMap(id);
    if (!result.ok) {
      store.setMessage(t(`editor.import.error.${result.error}`, { detail: result.detail ?? '' }), true);
      return;
    }
    store.load(fromMapDocument(result.document));
    viewport.current?.frameMap();
    store.setMessage(null);
    setDialog(null);
  };

  const chooseProblem = (problem: MapProblem): void => {
    if (problem.at) viewport.current?.centreOn(problem.at);
    if (problem.target?.kind === 'map-properties') {
      openDialog('properties');
      return;
    }
    const selection = problemSelection(problem);
    if (selection.length > 0) {
      const first = selection[0]!;
      if (first.kind === 'event' || first.kind === 'event-place') {
        // add-battle-events 4.3: the Events panel opens on the event; a place is selected with its tool.
        store.updateView({ events: true });
        const place = first.kind === 'event-place' ? (store.map.eventPlaces ?? []).find((entry) => entry.id === first.id) : undefined;
        store.setTool(place ? (place.kind === 'entry' ? 'entry-point' : 'event-area') : 'select');
      } else store.setTool(first.kind === 'section' || first.kind === 'area' ? 'deployment' : first.kind === 'objective' ? 'objective' : first.kind === 'exit' ? 'exit' : 'select');
      store.setSelection(selection);
    }
  };

  const { map, settings, tool, view } = store;
  return (
    <div className="editor">
      <header className="editor-toolbar">
        <span className="editor-title">{t('editor.title')}</span>
        <button type="button" data-testid="editor-new" onClick={() => openDialog('new')}>{t('editor.file.new')}</button>
        <button type="button" data-testid="editor-open" onClick={() => openDialog('open')}>{t('editor.file.open')}</button>
        <button type="button" data-testid="editor-properties" onClick={() => openDialog('properties')}>{t('editor.file.properties')}</button>
        <button type="button" onClick={() => fileInput.current?.click()}>{t('editor.file.import')}</button>
        <input
          ref={fileInput}
          type="file"
          data-testid="editor-import-input"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void onImport(file);
          }}
        />
        <button type="button" data-testid="editor-export" onClick={() => exportDocument(toMapDocument(store.map))}>{t('editor.file.export')}</button>
        {import.meta.env.DEV ? (
          <button type="button" data-testid="editor-save-project" onClick={() => void onSaveToProject()}>{t('editor.file.saveProject')}</button>
        ) : null}
        {import.meta.env.DEV ? (
          <button type="button" data-testid="editor-thumbnail" title={t('editor.thumbnail.hint')} onClick={() => void onSaveThumbnail()}>{t('editor.thumbnail')}</button>
        ) : null}
        <span className="editor-separator" />
        <button type="button" data-testid="editor-undo" disabled={!store.canUndo} onClick={() => store.undo()}>{t('editor.file.undo')}</button>
        <button type="button" data-testid="editor-redo" disabled={!store.canRedo} onClick={() => store.redo()}>{t('editor.file.redo')}</button>
        <button
          type="button"
          data-testid="editor-clear"
          title={t('editor.file.clearHint')}
          onClick={() => {
            if (window.confirm(t('editor.file.clearConfirm'))) store.clearMap();
          }}
        >
          {t('editor.file.clear')}
        </button>
        <span className="editor-separator" />
        <button type="button" aria-pressed={!view.topDown} onClick={() => store.updateView({ topDown: false })}>{t('editor.view.3d')}</button>
        <button type="button" aria-pressed={view.topDown} onClick={() => store.updateView({ topDown: true })}>{t('editor.view.2d')}</button>
        <button type="button" aria-pressed={view.grid} onClick={() => store.updateView({ grid: !view.grid })}>{t('editor.view.grid')}</button>
        <button type="button" data-testid="editor-cover" aria-pressed={view.cover} onClick={() => store.updateView({ cover: !view.cover })}>{t('editor.view.cover')}</button>
        <button type="button" data-testid="editor-events-toggle" aria-pressed={view.events} onClick={() => store.updateView({ events: !view.events })}>{t('editor.view.events')}</button>
        <select data-testid="editor-overlay" value={view.overlay} onChange={(event) => store.updateView({ overlay: event.target.value as typeof view.overlay })}>
          {(['none', 'relief', 'contours', 'slope'] as const).map((overlay) => (
            <option key={overlay} value={overlay}>{t(`editor.overlay.${overlay}`)}</option>
          ))}
        </select>
        <span className="editor-separator" />
        <button type="button" data-testid="editor-validate" onClick={() => runValidation()}>{t('editor.file.validate')}</button>
        <button type="button" className="editor-primary" data-testid="editor-playtest" onClick={() => void onPlaytest()}>{t('editor.file.playtest')}</button>
        <span className="editor-spacer" />
        <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
          {LOCALES.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        <a className="editor-link" href="./index.html">{t('editor.file.back')}</a>
      </header>

      <nav className="editor-tools" aria-label={t('editor.tools')}>
        {TOOL_GROUPS.map((group) => (
          <section key={group.layer}>
            <h3>{t(group.layer)}</h3>
            {group.tools.map((id) => (
              <button
                key={id}
                type="button"
                data-tool={id}
                aria-pressed={paletteActive(id, tool, settings)}
                title={id in TOOL_KEYS && TOOL_KEYS[id as ToolId] ? `${t(`editor.tool.${id}`)} (${TOOL_KEYS[id as ToolId]})` : t(`editor.tool.${id}`)}
                onClick={() => choosePaletteEntry(store, id)}
              >
                {t(`editor.tool.${id}`)}
              </button>
            ))}
          </section>
        ))}
      </nav>

      <main className="editor-viewport" data-testid="editor-viewport" data-ready={ready} ref={container}>
        {!ready ? <div className="editor-loading">{t('editor.loading')}</div> : null}
        <Compass
          className="editor-compass"
          testId="editor-compass"
          north={previewNorth ?? mapNorth(map.north)}
          view={editorCamera}
          letter={t('editor.north.letter')}
          label={t('editor.north.arrow')}
        />
      </main>

      <aside className="editor-properties">
        <h2>{t(`editor.tool.${tool}`)}</h2>
        <p className="editor-hint">{t(hintKey(tool))}</p>
        <ToolProperties store={store} t={t} />
        {view.cover ? <CoverPanel store={store} t={t} /> : null}
        {view.events || tool === 'entry-point' || tool === 'event-area' ? (
          <Suspense fallback={null}>
            <EventsPanel store={store} t={t} />
          </Suspense>
        ) : null}
        {tool === 'select' || tool === 'objective' ? <SelectionPanel store={store} viewport={viewport.current} t={t} /> : null}
        {settings.snap !== undefined && ['road', 'river', 'pond', 'line', 'bridge', 'ferry', 'place', 'select', 'deployment'].includes(tool) ? (
          <label>
            {t('editor.prop.snap')}
            <select value={String(settings.snap)} onChange={(event) => store.updateSettings({ snap: Number(event.target.value) as 0 | 0.5 | 1 })}>
              <option value="0">{t('editor.prop.snapFree')}</option>
              <option value="0.5">{t('editor.prop.snap05')}</option>
              <option value="1">{t('editor.prop.snap1')}</option>
            </select>
          </label>
        ) : null}
      </aside>

      {store.problems ? (
        <section className="editor-problems" data-testid="editor-problems">
          <h3>
            {t('editor.problems.title')}
            <button type="button" onClick={() => { store.problems = null; store.emit(); }}>{t('editor.map.close')}</button>
          </h3>
          {store.problems.length === 0 ? <p>{t('editor.problems.none')}</p> : null}
          <ul>
            {store.problems.map((problem, index) => (
              <li key={index} data-severity={problem.severity} data-code={problem.code}>
                <button type="button" onClick={() => chooseProblem(problem)}>
                  <strong>{t(problem.severity === 'error' ? 'editor.problems.error' : 'editor.problems.warning')}</strong> {problemText(problem, t)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="editor-status">
        <span>{map.id} · {t(`editor.map.size.${map.size}`)}</span>
        <span>{cursor ? t('editor.status.position', { x: cursor.x.toFixed(1), y: cursor.y.toFixed(1), h: cursor.height.toFixed(2) }) : ''}</span>
        {view.overlay === 'relief' || view.overlay === 'contours' ? (
          <span className="editor-legend" data-overlay={view.overlay}>
            {t('editor.relief.legend', { low: heightRange(map).low.toFixed(1), high: heightRange(map).high.toFixed(1) })}
          </span>
        ) : null}
        <span data-state={store.saveState}>{t(`editor.status.${store.saveState}`)}</span>
        {store.message ? <span data-testid="editor-message" className={store.message.error ? 'editor-error' : 'editor-ok'}>{store.message.text}</span> : null}
      </footer>

      {dialog === 'open' ? (
        <OpenDialog maps={projectMaps} locale={locale} t={t} onOpen={(id) => void onOpenProjectMap(id)} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'new' || dialog === 'properties' ? (
        <MapDialog
          mode={dialog}
          map={map}
          maps={projectMaps ?? []}
          locale={locale}
          t={t}
          onClose={() => {
            viewport.current?.previewLight(null);
            setPreviewNorth(null);
            setDialog(null);
          }}
          onPreviewLight={(light, north) => {
            viewport.current?.view.previewLight(light, north);
            setPreviewNorth(north);
          }}
          onCreate={(next) => {
            store.load(next);
            viewport.current?.frameMap();
            setDialog(null);
          }}
          onApply={(next) => {
            store.execute(replaceCommand(store.map, next));
            if (next.size !== map.size) viewport.current?.frameMap();
            setPreviewNorth(null);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function NumberField(props: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }): ReactNode {
  return (
    <label>
      {props.label}
      <span className="editor-range">
        <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} />
        <input type="number" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(event) => props.onChange(Math.max(props.min, Math.min(props.max, Number(event.target.value))))} />
      </span>
    </label>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }): ReactNode {
  return (
    <label className="editor-check">
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
      {props.label}
    </label>
  );
}

/** A material's own pixel-art tile from the ground atlas (5 x 4 tiles). */
function swatchStyle(index: number, color: number): CSSProperties {
  const column = index % GROUND_ATLAS.columns;
  const row = Math.floor(index / GROUND_ATLAS.columns);
  return {
    backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
    backgroundImage: 'url(./models/textures/ground-atlas.png)',
    backgroundSize: `${GROUND_ATLAS.columns * 100}% ${GROUND_ATLAS.rows * 100}%`,
    backgroundPosition: `${(column / (GROUND_ATLAS.columns - 1)) * 100}% ${(row / (GROUND_ATLAS.rows - 1)) * 100}%`,
  };
}

function MaterialSwatches(props: { value: GroundMaterialId; t: T; onChange: (id: GroundMaterialId) => void }): ReactNode {
  const group = (kind: 'basic' | 'detailed') => (
    <>
      <span className="editor-swatch-group">{props.t(`editor.materials.${kind}`)}</span>
      {GROUND_MATERIAL_IDS.filter((id) => groundMaterial(groundMaterialIndex(id)).kind === kind).map((id) => {
        const material = groundMaterial(groundMaterialIndex(id));
        return (
          <button
            key={id}
            type="button"
            role="option"
            aria-selected={props.value === id}
            title={`${props.t(material.nameKey)} · ${props.t('editor.prop.surface', { speed: surfaceSpeed(material.surface).toFixed(2) })}`}
            data-material={id}
            style={swatchStyle(groundMaterialIndex(id), material.color)}
            onClick={() => props.onChange(id)}
          />
        );
      })}
    </>
  );
  return (
    <div className="editor-swatches" role="listbox" aria-label={props.t('editor.prop.material')}>
      {group('basic')}
      {group('detailed')}
      <span className="editor-swatch-name">{props.t(`editor.material.${props.value}`)}</span>
    </div>
  );
}

/** Lowest and highest stored ground (m) of the open map, for the relief legend. */
function heightRange(map: EditableMap): { low: number; high: number } {
  let low = Infinity;
  let high = -Infinity;
  for (const value of map.heights) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return { low: low / 100, high: high / 100 };
}

/** add-withdrawal-exits 6.1: the selected exit's names, and the requirement as it stands. */
function ExitPanel({ store, t }: { store: EditorStore; t: T }): ReactNode {
  const withdrawal = store.map.withdrawal;
  const selected = store.selection.find((item) => item.kind === 'exit');
  const exit = selected && 'id' in selected ? withdrawal?.exits.find((entry) => entry.id === selected.id) : undefined;
  return (
    <div className="editor-exit" data-testid="exit-panel">
      {withdrawal ? (
        <p className="editor-hint" data-testid="exit-requirement">
          {t(withdrawal.requirement.command ? 'editor.exit.requirementCommand' : 'editor.exit.requirement', { count: withdrawal.requirement.sections })}
        </p>
      ) : (
        <p className="editor-hint">{t('editor.exit.none')}</p>
      )}
      {exit ? (
        <>
          <label>
            {t('editor.exit.namePt')}
            <input type="text" data-testid="exit-name-pt" value={exit.name['pt-BR']} onChange={(event) => store.editVector((draft) => renameExit(draft, exit.id, 'pt-BR', event.target.value))} />
          </label>
          <label>
            {t('editor.exit.nameEn')}
            <input type="text" data-testid="exit-name-en" value={exit.name.en} onChange={(event) => store.editVector((draft) => renameExit(draft, exit.id, 'en', event.target.value))} />
          </label>
        </>
      ) : null}
    </div>
  );
}

function ToolProperties({ store, t }: { store: EditorStore; t: T }): ReactNode {
  const { tool, settings } = store;
  const set = store.updateSettings.bind(store);
  const brush = ['paint', 'erase', 'vegetation', 'raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise'].includes(tool);
  const fields: ReactNode[] = [];
  if (brush) {
    fields.push(
      <NumberField key="size" label={t('editor.prop.size')} value={settings.size} min={1} max={64} step={1} onChange={(size) => set({ size })} />,
      <NumberField key="strength" label={t('editor.prop.strength')} value={settings.strength} min={0.05} max={1} step={0.05} onChange={(strength) => set({ strength })} />,
      <label key="shape">
        {t('editor.prop.shape')}
        <select value={settings.shape} onChange={(event) => set({ shape: event.target.value as 'round' | 'square' })}>
          <option value="round">{t('editor.prop.round')}</option>
          <option value="square">{t('editor.prop.square')}</option>
        </select>
      </label>,
    );
  }
  if (tool === 'paint' || tool === 'fill') fields.push(<MaterialSwatches key="material" value={settings.material} t={t} onChange={(material) => set({ material })} />);
  if (tool === 'setHeight') fields.push(<NumberField key="height" label={t('editor.prop.height')} value={settings.heightValue} min={-12} max={40} step={0.1} onChange={(heightValue) => set({ heightValue })} />);
  if (tool === 'noise') fields.push(<NumberField key="seed" label={t('editor.prop.seed')} value={settings.seed} min={0} max={99999} step={1} onChange={(seed) => set({ seed })} />);
  if (tool === 'vegetation') {
    fields.push(
      <label key="vegetation">
        {t('editor.prop.vegetation')}
        <select data-testid="prop-vegetation" value={settings.vegetation} onChange={(event) => set({ vegetation: Number(event.target.value) })}>
          <option value={0}>{t('editor.vegetation.none')}</option>
          {PAINTED_VEGETATION_KINDS.map((kind, index) => (
            <option key={kind} value={index + 1}>{t(`editor.vegetation.${kind}`)}</option>
          ))}
        </select>
      </label>,
      <label key="vegetationDensity">
        {t('editor.prop.vegetationDensity')}
        <select data-testid="prop-vegetation-density" value={settings.vegetationDensity} onChange={(event) => set({ vegetationDensity: Number(event.target.value) })}>
          {VEGETATION_DENSITIES.map((density, index) => (
            <option key={density} value={index}>{t(`editor.vegetation.density.${density}`)}</option>
          ))}
        </select>
      </label>,
      <p key="vegetationDensityHint" className="editor-hint">{t('editor.vegetation.densityHint')}</p>,
    );
  }
  if (tool === 'road' || tool === 'bridge') {
    if (tool === 'road') {
      fields.push(
        <label key="roadType">
          {t('editor.prop.roadType')}
          <select data-testid="prop-road-type"
            value={settings.roadType}
            onChange={(event) => {
              const nextType = event.target.value as RoadType;
              set({ roadType: nextType, roadWidth: roadType(nextType).defaultWidth });
            }}
          >
            {ROAD_TYPES.map(({ type: id }) => (
              <option key={id} value={id}>{t(`editor.road.${id}`)}</option>
            ))}
          </select>
        </label>,
      );
    }
    fields.push(<NumberField key="width" label={t('editor.prop.width')} value={settings.roadWidth} min={1.5} max={12} step={0.5} onChange={(roadWidth) => set({ roadWidth })} />);
    if (tool === 'road') {
      fields.push(
        <Check key="dl" label={t('editor.prop.ditchLeft')} checked={settings.ditchLeft} onChange={(ditchLeft) => set({ ditchLeft })} />,
        <Check key="dr" label={t('editor.prop.ditchRight')} checked={settings.ditchRight} onChange={(ditchRight) => set({ ditchRight })} />,
      );
    }
  }
  if (tool === 'river' || tool === 'pond') {
    if (tool === 'river') fields.push(<NumberField key="riverWidth" label={t('editor.prop.width')} value={settings.riverWidth} min={3} max={60} step={1} onChange={(riverWidth) => set({ riverWidth })} />);
    fields.push(
      <label key="water">
        {t('editor.prop.waterKind')}
        <select data-testid="prop-water" value={settings.waterKind} onChange={(event) => set({ waterKind: event.target.value as 'deep' | 'ford' })}>
          <option value="deep">{t('editor.prop.deep')}</option>
          <option value="ford">{t('editor.prop.ford')}</option>
        </select>
      </label>,
    );
  }
  if (tool === 'line') {
    fields.push(
      <LineTiles key="lineKind" t={t} value={settings.lineKind} rockKind={settings.rockKind} onChange={(lineKind) => set({ lineKind, lineHeight: lineKindEntry(lineKind).defaultHeight })} />,
      <NumberField key="lineHeight" label={t('editor.prop.height')} value={settings.lineHeight} min={0.5} max={3} step={0.1} onChange={(lineHeight) => set({ lineHeight })} />,
    );
    if (takesRockKind(settings.lineKind)) {
      fields.push(<RockKindPicker key="rockKind" t={t} value={settings.rockKind} onChange={(rockKind) => set({ rockKind })} testId="line-rock-kind" />);
    }
  }
  if (tool === 'trench') {
    fields.push(
      <TrenchFields
        key="trench"
        t={t}
        value={{ kind: settings.trenchKind, depth: settings.trenchDepth, facing: settings.trenchFacing, bays: settings.trenchBays, parapet: settings.trenchParapet }}
        onChange={(patch) =>
          set({
            ...(patch.kind !== undefined ? { trenchKind: patch.kind } : {}),
            ...(patch.depth !== undefined ? { trenchDepth: patch.depth } : {}),
            ...(patch.facing !== undefined ? { trenchFacing: patch.facing } : {}),
            ...(patch.bays !== undefined ? { trenchBays: patch.bays } : {}),
            ...(patch.parapet !== undefined ? { trenchParapet: patch.parapet } : {}),
          })
        }
      />,
    );
  }
  if (tool === 'trees') {
    fields.push(<TreeFields key="trees" store={store} t={t} />);
  }
  if (tool === 'place') {
    const entry = catalogObject(settings.objectType);
    fields.push(
      <div key="catalog" className="editor-catalog">
        {OBJECT_GROUPS.map((group) => (
          <CatalogGroup key={group} group={group} initiallyOpen={entry?.group === group} t={t}>
            {(open) => group === 'stone' ? (
              <StoneTiles t={t} objectType={settings.objectType} rockKind={settings.rockKind} onType={(objectType) => set({ objectType })} onKind={(rockKind) => set({ rockKind })} />
            ) : group === 'tree' ? (
              CATALOG_OBJECTS.filter((object) => object.group === group && isListed(object)).map((object) => (
                // D5b: one tile per species; its forms are chosen with the switch below.
                <button
                  key={object.id}
                  type="button"
                  data-object={object.id}
                  aria-pressed={settings.objectType === object.id || (!!object.species && entry?.species === object.species)}
                  onClick={() => set({ objectType: object.id })}
                >
                  {t(object.nameKey)}
                </button>
              ))
            ) : (group === 'prop' ? PROP_SUBGROUPS : [undefined]).map((subgroup) => (
              <Fragment key={subgroup ?? 'all'}>
                {subgroup ? <h4 className="editor-subgroup">{t(`editor.subgroup.${subgroup}`)}</h4> : null}
                <ObjectTiles
                  t={t}
                  objects={CATALOG_OBJECTS.filter((object) => object.group === group && isListed(object) && (group !== 'prop' || object.subgroup === subgroup))}
                  objectType={settings.objectType}
                  onType={(objectType) => set({ objectType })}
                  pictured={open}
                />
              </Fragment>
            ))}
          </CatalogGroup>
        ))}
      </div>,
      ...formSwitch(settings.objectType, t, (objectType) => set({ objectType })),
      <NumberField key="rotation" label={t('editor.prop.rotation')} value={settings.rotation} min={0} max={359} step={settings.rotateStep ? 15 : 1} onChange={(rotation) => set({ rotation })} />,
      <NumberField key="scale" label={t('editor.prop.scale')} value={settings.scale} min={0.5} max={2} step={0.1} onChange={(scale) => set({ scale })} />,
      <Check key="step" label={t('editor.prop.rotateStep')} checked={settings.rotateStep} onChange={(rotateStep) => set({ rotateStep })} />,
    );
    if (entry) {
      fields.push(
        <div key="footprint" className="editor-footprint">
          <h4>{t('editor.prop.footprint')}</h4>
          <ul>
            {footprintFacts(entry, t).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>,
      );
    }
  }
  if (tool === 'exit') fields.push(<ExitPanel key="exit" store={store} t={t} />);
  return <div className="editor-fields">{fields}</div>;
}

function SelectionPanel({ store, viewport, t }: { store: EditorStore; viewport: EditorViewport | null; t: T }): ReactNode {
  const selection = store.selection;
  if (selection.length === 0) return <p className="editor-hint">{t('editor.prop.nothing')}</p>;
  const first = selection[0]!;
  const object = first.kind === 'object' && selection.length === 1 ? store.map.objects.find((entry) => entry.id === first.id) : undefined;
  const entry = object ? catalogObject(object.type) : undefined;
  const road = first.kind === 'road' && selection.length === 1 ? store.map.roads.find((item) => item.id === first.id) : undefined;
  const line = first.kind === 'line' && selection.length === 1 ? store.map.lines.find((item) => item.id === first.id) : undefined;
  const trench = first.kind === 'trench' && selection.length === 1 ? store.map.trenches.find((item) => item.id === first.id) : undefined;
  const river = first.kind === 'river' && selection.length === 1 ? store.map.rivers.find((item) => item.id === first.id) : undefined;
  const objective = first.kind === 'objective' && selection.length === 1 ? (store.map.objectives ?? []).find((item) => item.id === first.id) : undefined;
  // add-map-objectives 1.3: edits one objective in place (undoable like every vector edit).
  const editObjective = (patch: (target: Objective) => Objective): void =>
    store.editVector((draft) => {
      draft.objectives = (draft.objectives ?? []).map((item) => (objective && item.id === objective.id ? patch(item) : item));
    });
  // A selected point marks the stretches on either side of it.
  const nearPoint = (stretch: number): boolean => first.kind === 'river' && first.point !== undefined && (stretch === first.point || stretch === first.point - 1);
  return (
    <div className="editor-fields">
      <p>{t('editor.prop.selected', { count: selection.length })}</p>
      {object && entry ? (
        <>
          <p>{t(entry.nameKey)}</p>
          <NumberField
            label={t('editor.prop.rotation')}
            value={Math.round(((object.rotation * 180) / Math.PI + 360) % 360)}
            min={0}
            max={359}
            step={1}
            onChange={(degrees) => store.editVector((draft) => { const target = draft.objects.find((item) => item.id === object.id); if (target) target.rotation = (degrees * Math.PI) / 180; })}
          />
          <NumberField
            label={t('editor.prop.scale')}
            value={object.scale ?? 1}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(scale) => store.editVector((draft) => { const target = draft.objects.find((item) => item.id === object.id); if (target) target.scale = scale; })}
          />
          {SIDED_CAMP.includes(entry.id) ? (
            <div className="editor-segmented" role="radiogroup" aria-label={t('editor.prop.side')} data-testid="object-side">
              {CAMP_SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={(object.variant === 'legalist' ? 'legalist' : 'column') === side}
                  data-side={side}
                  onClick={() =>
                    store.editVector((draft) => {
                      const target = draft.objects.find((item) => item.id === object.id);
                      if (!target) return;
                      if (side === 'legalist') target.variant = side;
                      else delete target.variant;
                    })
                  }
                >
                  {t(`editor.side.${side}`)}
                </button>
              ))}
            </div>
          ) : null}
          {takesRockKind(entry.id) ? (
            <RockKindPicker
              t={t}
              value={(object.variant as RockKind | undefined) ?? 'granite'}
              testId="object-rock-kind"
              onChange={(kind) =>
                store.editVector((draft) => {
                  const target = draft.objects.find((item) => item.id === object.id);
                  if (!target) return;
                  if (kind === 'granite') delete target.variant;
                  else target.variant = kind;
                })
              }
            />
          ) : null}
          {entry.footprint.kind === 'building' && buildingVariants(entry.footprint.model).length > 0 ? (
            <div className="editor-segmented" role="radiogroup" aria-label={t('editor.prop.variant')} data-testid="object-variant">
              {[undefined, ...buildingVariants(entry.footprint.model)].map((variant) => (
                <button
                  key={variant ?? 'default'}
                  type="button"
                  role="radio"
                  aria-checked={(object.variant ?? undefined) === variant}
                  data-variant={variant ?? 'default'}
                  onClick={() =>
                    store.editVector((draft) => {
                      const target = draft.objects.find((item) => item.id === object.id);
                      if (!target) return;
                      if (variant) target.variant = variant;
                      else delete target.variant;
                    })
                  }
                >
                  {t(`editor.variant.${variant ?? 'default'}`)}
                </button>
              ))}
            </div>
          ) : null}
          <div className="editor-footprint">
            <h4>{t('editor.prop.footprint')}</h4>
            <ul>
              {footprintFacts(entry, t).map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
          {entry.footprint.kind === 'building' ? <PositionFacts position={store.positionOf('object', object.id)} t={t} /> : null}
        </>
      ) : null}
      {road ? (
        <>
          <p>{t(`editor.road.${road.type}`)}</p>
          <NumberField label={t('editor.prop.width')} value={road.width} min={1.5} max={12} step={0.5} onChange={(width) => store.editVector((draft) => { const target = draft.roads.find((item) => item.id === road.id); if (target) target.width = width; })} />
        </>
      ) : null}
      {river ? (
        <>
          <p>{t('editor.tool.river')}</p>
          <NumberField label={t('editor.prop.width')} value={river.width} min={3} max={60} step={1} onChange={(width) => store.editVector((draft) => { const target = draft.rivers.find((item) => item.id === river.id); if (target) target.width = width; })} />
          {/* author-game-maps: each stretch between two points is deep or a ford, set here after drawing. */}
          <fieldset className="editor-stretches" data-testid="river-stretches">
            <legend>{t('editor.river.stretches')}</legend>
            {river.kinds.map((kind, stretch) => (
              <label key={stretch} className={nearPoint(stretch) ? 'editor-stretch-near' : undefined}>
                {t('editor.river.stretch', { number: stretch + 1 })}
                <select
                  data-testid={`river-stretch-${stretch}`}
                  value={kind}
                  onChange={(event) =>
                    store.editVector((draft) => {
                      const target = draft.rivers.find((item) => item.id === river.id);
                      if (target) target.kinds[stretch] = event.target.value as 'deep' | 'ford';
                    })
                  }
                >
                  <option value="deep">{t('editor.prop.deep')}</option>
                  <option value="ford">{t('editor.prop.ford')}</option>
                </select>
              </label>
            ))}
            <p className="editor-hint">{t('editor.river.hint')}</p>
          </fieldset>
        </>
      ) : null}
      {line ? (
        <>
          <p>{t(`editor.line.${line.kind}`)}</p>
          {takesRockKind(line.kind) ? (
            <RockKindPicker
              t={t}
              value={(line.variant as RockKind | undefined) ?? 'granite'}
              testId="line-rock-kind"
              onChange={(kind) =>
                store.editVector((draft) => {
                  const target = draft.lines.find((item) => item.id === line.id);
                  if (!target) return;
                  if (kind === 'granite') delete target.variant;
                  else target.variant = kind;
                })
              }
            />
          ) : null}
          <NumberField label={t('editor.prop.height')} value={line.height} min={0.5} max={3} step={0.1} onChange={(height) => store.editVector((draft) => { const target = draft.lines.find((item) => item.id === line.id); if (target) target.height = height; })} />
        </>
      ) : null}
      {trench ? (
        <>
          <TrenchFields
            t={t}
            value={trench}
            onChange={(patch) =>
              store.editVector((draft) => {
                const target = draft.trenches.find((item) => item.id === trench.id);
                if (!target) return;
                Object.assign(target, patch);
                if (target.kind !== 'fire') target.bays = false;
              })
            }
          />
          <ul className="editor-footprint" data-testid="trench-facts">
            <li data-testid="trench-length">{t('editor.trench.length', { length: trenchLength(trench.points).toFixed(1) })}</li>
            <li data-testid="trench-slots">{t('editor.trench.slots', { count: trenchSlotCount(trench) })}</li>
            <li data-testid="trench-capacity">{t('editor.trench.capacity', { count: trenchSlotCount(trench) })}</li>
          </ul>
          <PositionFacts position={store.positionOf('trench', trench.id)} t={t} />
          <button type="button" data-testid="trench-flip" onClick={() => viewport?.flipTrenches([trench.id])}>{t('editor.trench.flip')}</button>
        </>
      ) : null}
      {objective ? (
        <div data-testid="objective-props">
          <label>
            {t('editor.objective.namePt')}
            <input type="text" data-testid="objective-name-pt" value={objective.name['pt-BR']} onChange={(event) => { const value = event.target.value; editObjective((item) => ({ ...item, name: { ...item.name, 'pt-BR': value } })); }} />
          </label>
          <label>
            {t('editor.objective.nameEn')}
            <input type="text" data-testid="objective-name-en" value={objective.name.en} onChange={(event) => { const value = event.target.value; editObjective((item) => ({ ...item, name: { ...item.name, en: value } })); }} />
          </label>
          <NumberField label={t('editor.objective.value')} value={objective.value} min={1} max={3} step={1} onChange={(value) => editObjective((item) => ({ ...item, value }))} />
          <NumberField
            label={t('editor.objective.radius')}
            value={Math.round(Math.hypot(objective.area[0]!.x - objective.flag.x, objective.area[0]!.y - objective.flag.y))}
            min={12}
            max={30}
            step={1}
            onChange={(radius) => editObjective((item) => ({ ...item, area: objectiveCircle(item.flag, radius) }))}
          />
          <label>
            {t('editor.objective.owner')}
            <select data-testid="objective-owner" value={objective.owner} onChange={(event) => { const owner = event.target.value as ObjectiveOwner; editObjective((item) => ({ ...item, owner })); }}>
              {(['neutral', 'column', 'legalist'] as const).map((owner) => (
                <option key={owner} value={owner}>{t(`editor.objective.owner.${owner}`)}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <div className="editor-row">
        {selection.some((item) => item.kind === 'object') ? <button type="button" onClick={() => viewport?.duplicateSelection()}>{t('editor.prop.duplicate')}</button> : null}
        <button type="button" onClick={() => viewport?.deleteSelection()}>{t('editor.prop.delete')}</button>
      </div>
    </div>
  );
}

/** A trench line's kind, depth, facing, bays and parapet (refine-map-editor 2.5). */
/**
 * refine-map-editor 5.1: the trees tool. Scatter paints a biome's mix at a
 * density, single places the chosen species, erase removes trees under the
 * brush. The species list shows each tree's thumbnail.
 */
function TreeFields({ store, t }: { store: EditorStore; t: T }): ReactNode {
  const { settings } = store;
  const set = store.updateSettings.bind(store);
  const species = useMemo(() => treeSpecies(), []);
  const pictures = useThumbnails(species.map((id) => catalogObject(id)!.model));
  const inMix = new Set(settings.treeMix);
  return (
    <>
      <div className="editor-segmented" role="radiogroup" aria-label={t('editor.prop.treeMode')}>
        {(['scatter', 'single', 'erase'] as const).map((mode) => (
          <button key={mode} type="button" role="radio" aria-checked={settings.treeMode === mode} data-testid={`tree-mode-${mode}`} onClick={() => set({ treeMode: mode })}>
            {t(`editor.trees.mode.${mode}`)}
          </button>
        ))}
      </div>
      {settings.treeMode !== 'single' ? (
        <NumberField label={t('editor.prop.size')} value={settings.size} min={2} max={64} step={1} onChange={(size) => set({ size })} />
      ) : (
        <NumberField label={t('editor.prop.rotation')} value={settings.rotation} min={0} max={359} step={15} onChange={(rotation) => set({ rotation })} />
      )}
      {settings.treeMode === 'scatter' ? (
        <>
          <label>
            {t('editor.prop.treeBiome')}
            <select
              data-testid="tree-biome"
              value={settings.treeBiome}
              onChange={(event) => {
                const treeBiome = event.target.value as TreeBiome;
                // The biome is a starting mix; the species below can then be switched on and off.
                set({ treeBiome, treeMix: BIOME_MIX[treeBiome].map((entry) => entry.type) });
              }}
            >
              {TREE_BIOMES.map((biome) => (
                <option key={biome} value={biome}>{t(`editor.trees.biome.${biome}`)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('editor.prop.treeDensity')}
            <select data-testid="tree-density" value={settings.treeDensity} onChange={(event) => set({ treeDensity: event.target.value as TreeDensity })}>
              {TREE_DENSITIES.map((density) => (
                <option key={density} value={density}>{t(`editor.trees.density.${density}`)}</option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {settings.treeMode === 'scatter' ? <p className="editor-hint" data-testid="tree-mix-hint">{t('editor.trees.mixHint')}</p> : null}
      {settings.treeMode !== 'erase' ? (
        <div className="editor-tree-species" role="listbox" aria-label={t('editor.prop.treeSpecies')}>
          {/* biome-trees-and-plants 4.2: the species by biome; the trees of no biome last. */}
          {[...FLORA_BIOMES, null].map((biome) => {
            const group = species.filter((id) => (catalogObject(id)!.biome ?? null) === biome);
            if (group.length === 0) return null;
            return (
              <div key={biome ?? 'other'} className="editor-tree-group" role="group" data-biome={biome ?? 'other'} aria-label={biome ? t(`editor.biome.${biome}`) : undefined}>
                {biome ? <h5>{t(`editor.biome.${biome}`)}</h5> : null}
          {group.map((id) => {
            const entry = catalogObject(id)!;
            const picture = pictures.get(entry.model);
            const chosen = settings.treeMode === 'single' ? settings.treeSpecies === id : inMix.has(id);
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={chosen}
                data-tree={id}
                title={t(entry.nameKey)}
                onClick={() => {
                  if (settings.treeMode !== 'scatter') return set({ treeSpecies: id });
                  // Scatter: the species toggles in the mix; the last one stays.
                  const next = inMix.has(id) ? settings.treeMix.filter((type) => type !== id) : [...settings.treeMix, id];
                  if (next.length > 0) set({ treeMix: next });
                }}
              >
                {picture ? <img src={picture} width={48} height={48} alt="" data-thumbnail={id} /> : <span className="editor-tree-blank" aria-hidden="true" />}
                <span>{t(entry.nameKey)}</span>
              </button>
            );
          })}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

/**
 * biome-trees-and-plants D5b: the Adult / Flowering / Dead switch for a
 * species with more than one form; nothing for any other object.
 */
/** revise-buildings-and-stone 4.3: the rock kind of a stone, corral or dry stone wall. */
function RockKindPicker({ t, value, onChange, testId }: { t: T; value: RockKind; onChange: (kind: RockKind) => void; testId: string }): ReactNode {
  return (
    <div className="editor-segmented editor-rock-kinds" role="radiogroup" aria-label={t('editor.prop.rockKind')} data-testid={testId}>
      {ROCK_KINDS.map((kind) => (
        <button key={kind} type="button" role="radio" aria-checked={value === kind} data-rock={kind} onClick={() => onChange(kind)}>
          {t(`editor.rock.${kind}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * revise-buildings-and-stone 5.4: a catalog group, folded; its tiles'
 * thumbnails are only rendered once it is opened.
 */
function CatalogGroup({ group, initiallyOpen, t, children }: { group: ObjectGroup; initiallyOpen: boolean; t: T; children: (open: boolean) => ReactNode }): ReactNode {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} data-group={group}>
      <summary>{t(`editor.group.${group}`)}</summary>
      {children(open)}
    </details>
  );
}

/** revise-buildings-and-stone 5.4: catalog objects as pictured tiles. */
function ObjectTiles({ t, objects, objectType, onType, pictured }: {
  t: T;
  objects: readonly CatalogObject[];
  objectType: string;
  onType: (objectType: string) => void;
  /** False while the group is folded: no thumbnails rendered yet. */
  pictured: boolean;
}): ReactNode {
  const pictures = useThumbnails(pictured ? objects.map((object) => object.model) : []);
  return (
    <div className="editor-stone-tiles editor-tiles">
      {objects.map((object) => {
        const picture = pictures.get(object.model);
        return (
          <button key={object.id} type="button" data-object={object.id} aria-pressed={objectType === object.id} title={t(object.nameKey)} onClick={() => onType(object.id)}>
            {picture ? <img src={picture} width={48} height={48} alt="" data-thumbnail={object.model} /> : <span className="editor-tree-blank" aria-hidden="true" />}
            <span>{t(object.nameKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** revise-buildings-and-stone 5.4: the line kinds as pictured tiles, a stone wall in the chosen rock. */
function LineTiles({ t, value, rockKind, onChange }: { t: T; value: LineKind; rockKind: RockKind; onChange: (kind: LineKind) => void }): ReactNode {
  const modelOf = (kind: LineKind): string => (takesRockKind(kind) && rockKind !== 'granite' ? `line:${kind}@${rockKind}` : `line:${kind}`);
  const pictures = useThumbnails(LINE_KINDS.map(({ kind }) => modelOf(kind)));
  return (
    <div className="editor-line-kind">
      <h4>{t('editor.prop.lineKind')}</h4>
      <div className="editor-stone-tiles editor-tiles" data-testid="prop-line-kind" data-value={value}>
        {LINE_KINDS.map(({ kind }) => {
          const picture = pictures.get(modelOf(kind));
          return (
            <button key={kind} type="button" data-line-kind={kind} aria-pressed={value === kind} title={t(`editor.line.${kind}`)} onClick={() => onChange(kind)}>
              {picture ? <img src={picture} width={48} height={48} alt="" data-thumbnail={modelOf(kind)} /> : <span className="editor-tree-blank" aria-hidden="true" />}
              <span>{t(`editor.line.${kind}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * revise-buildings-and-stone 4.3: the stones of the catalog grouped by rock
 * kind: the kind first, then each stone pictured in it. The lajedo slab
 * comes in one rock only.
 */
function StoneTiles({ t, objectType, rockKind, onType, onKind }: {
  t: T;
  objectType: string;
  rockKind: RockKind;
  onType: (objectType: string) => void;
  onKind: (kind: RockKind) => void;
}): ReactNode {
  const stones = CATALOG_OBJECTS.filter((object) => object.group === 'stone' && isListed(object));
  const modelOf = (object: { id: string; model: string }): string =>
    takesRockKind(object.id) && rockKind !== 'granite' ? `${object.model}@${rockKind}` : object.model;
  const pictures = useThumbnails(stones.map(modelOf));
  return (
    <>
      <RockKindPicker t={t} value={rockKind} onChange={onKind} testId="stone-rock-kind" />
      <div className="editor-stone-tiles" data-testid="stone-tiles" data-kind={rockKind}>
        {stones.map((object) => {
          const picture = pictures.get(modelOf(object));
          return (
            <button key={object.id} type="button" data-object={object.id} aria-pressed={objectType === object.id} title={t(object.nameKey)} onClick={() => onType(object.id)}>
              {picture ? <img src={picture} width={48} height={48} alt="" data-thumbnail={modelOf(object)} /> : <span className="editor-tree-blank" aria-hidden="true" />}
              <span>{t(object.nameKey)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function formSwitch(objectType: string, t: T, choose: (objectType: string) => void): ReactNode[] {
  const forms = speciesForms(objectType);
  const kinds = (['adult', 'flowering', 'dead'] as const).filter((form) => forms[form]);
  if (kinds.length < 2) return [];
  return [
    <div key="form" className="editor-segmented" role="radiogroup" aria-label={t('editor.prop.treeForm')} data-testid="object-form">
      {kinds.map((form) => (
        <button key={form} type="button" role="radio" aria-checked={forms[form] === objectType} data-testid={`object-form-${form}`} onClick={() => choose(forms[form]!)}>
          {t(`editor.form.${form}`)}
        </button>
      ))}
    </div>,
  ];
}

/** The name of a cover piece in the panel. */
function coverPieceName(store: EditorStore, piece: CoverPiece, t: T): string {
  switch (piece.kind) {
    case 'object': {
      const object = store.map.objects.find((entry) => entry.id === piece.id);
      const entry = object && catalogObject(object.type);
      return entry ? t(entry.nameKey) : t('editor.cover.piece.object');
    }
    case 'line': {
      const line = store.map.lines.find((entry) => entry.id === piece.id);
      return line ? t(`editor.line.${line.kind}`) : t('editor.cover.piece.line');
    }
    case 'trench': {
      const line = store.map.trenches.find((entry) => entry.id === piece.id);
      return line ? t(`editor.trench.${line.kind}`) : t('editor.cover.piece.trench');
    }
    case 'ditch':
      return t('editor.cover.piece.ditch');
  }
}

/**
 * refine-map-editor 6.1: the cover overlay's panel. The legend of the slot
 * dots, the slots inside each side's deployment area and the piece under the
 * pointer, all read from the game's own slots.
 */
/** garrison-and-assault 4.6: what the battle makes of a building or trench line: men inside, ways in, firing posts. */
function PositionFacts({ position, t }: { position: PositionDef | null; t: T }): ReactNode {
  return (
    <div className="editor-footprint" data-testid="position-facts">
      <h4>{t('editor.position.title')}</h4>
      {position ? (
        <ul>
          <li data-testid="position-capacity" data-value={position.capacity}>{t('editor.position.capacity', { count: position.capacity })}</li>
          <li data-testid="position-entrances" data-value={position.entrances.length}>{t('editor.position.entrances', { count: position.entrances.length })}</li>
          <li data-testid="position-ports" data-value={position.ports.length}>{t('editor.position.ports', { count: position.ports.length })}</li>
        </ul>
      ) : (
        <p data-testid="position-none">{t('editor.position.none')}</p>
      )}
    </div>
  );
}

function CoverPanel({ store, t }: { store: EditorStore; t: T }): ReactNode {
  const preview = store.coverPreview();
  const hovered = store.coverHover ? preview.pieces.find((piece) => piece.key === store.coverHover) : undefined;
  const hoveredSlots = hovered ? preview.slots.filter((slot) => slot.piece === hovered.key) : [];
  const colour = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
  return (
    <section className="editor-cover-panel" data-testid="cover-panel">
      <h3>{t('editor.cover.title')}</h3>
      <ul className="editor-cover-legend">
        {PROTECTION_CLASSES.map((stance) => (
          <li key={stance}>
            <span className="editor-cover-dot" style={{ background: colour(PROTECTION_COLORS[stance]) }} />
            {t(`editor.cover.class.${stance}`)}
          </li>
        ))}
        <li>
          <span className="editor-cover-hatch" />
          {t('editor.cover.concealment')}
        </li>
      </ul>
      {(['column', 'legalist'] as const).map((side) => {
        const zone = preview.zones[side];
        return (
          <p key={side} className="editor-cover-zone" data-testid={`zone-total-${side}`} data-total={zone.total}>
            {t('editor.cover.zone', { side: t(`editor.side.${side}`), total: zone.total })}
            <span>{t('editor.cover.byClass', { standing: zone.byClass.standing, crouched: zone.byClass.crouched, prone: zone.byClass.prone })}</span>
          </p>
        );
      })}
      {hovered ? (
        <p className="editor-cover-hover" data-testid="cover-hover" data-piece={hovered.key} data-count={hovered.count}>
          <strong>{coverPieceName(store, hovered.piece, t)}</strong>
          {t('editor.cover.hover', { count: hovered.count })}
          <span>
            {t('editor.cover.byClass', {
              standing: hoveredSlots.filter((slot) => slot.protects === 'standing').length,
              crouched: hoveredSlots.filter((slot) => slot.protects === 'crouched').length,
              prone: hoveredSlots.filter((slot) => slot.protects === 'prone').length,
            })}
          </span>
        </p>
      ) : (
        <p className="editor-hint">{t('editor.cover.hoverNone')}</p>
      )}
    </section>
  );
}

function TrenchFields({ value, onChange, t }: {
  value: { kind: TrenchKind; depth: TrenchDepth; facing: TrenchFacing; bays: boolean; parapet: TrenchParapet };
  onChange: (patch: Partial<{ kind: TrenchKind; depth: TrenchDepth; facing: TrenchFacing; bays: boolean; parapet: TrenchParapet }>) => void;
  t: T;
}): ReactNode {
  const fire = value.kind === 'fire';
  return (
    <>
      <label>
        {t('editor.prop.trenchKind')}
        <select data-testid="prop-trench-kind" value={value.kind} onChange={(event) => onChange({ kind: event.target.value as TrenchKind })}>
          <option value="fire">{t('editor.trench.fire')}</option>
          <option value="communication">{t('editor.trench.communication')}</option>
        </select>
      </label>
      <label>
        {t('editor.prop.trenchDepth')}
        <select data-testid="prop-trench-depth" value={value.depth} onChange={(event) => onChange({ depth: Number(event.target.value) as TrenchDepth })}>
          <option value={1.2}>{t('editor.trench.deep')}</option>
          <option value={0.8}>{t('editor.trench.shallow')}</option>
        </select>
      </label>
      {fire ? (
        <>
          <label>
            {t('editor.prop.trenchFacing')}
            <select data-testid="prop-trench-facing" value={value.facing} onChange={(event) => onChange({ facing: event.target.value as TrenchFacing })}>
              <option value="left">{t('editor.trench.left')}</option>
              <option value="right">{t('editor.trench.right')}</option>
            </select>
          </label>
          <Check label={t('editor.prop.trenchBays')} checked={value.bays} onChange={(bays) => onChange({ bays })} />
          <label>
            {t('editor.prop.trenchParapet')}
            <select data-testid="prop-trench-parapet" value={value.parapet} onChange={(event) => onChange({ parapet: event.target.value as TrenchParapet })}>
              <option value="earth">{t('editor.trench.earth')}</option>
              <option value="sandbag">{t('editor.trench.sandbag')}</option>
            </select>
          </label>
        </>
      ) : null}
    </>
  );
}

/** "07:30" for 7.5 h. */
const lightClock = (time: number): string => `${String(Math.floor(time)).padStart(2, '0')}:${time % 1 >= 0.5 ? '30' : '00'}`;
/** The eight-point compass direction of a bearing. */
const compassPoint = (bearing: number): string => ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'][Math.round((((bearing % 360) + 360) % 360) / 45) % 8]!;

function MapDialog(props: {
  mode: 'new' | 'properties';
  map: EditableMap;
  maps: readonly AuthoredMapEntry[];
  locale: Locale;
  t: T;
  onClose: () => void;
  onPreviewLight: (light: MapLight, north: number) => void;
  onCreate: (map: EditableMap) => void;
  onApply: (map: EditableMap) => void;
}): ReactNode {
  const { mode, map, t } = props;
  const [id, setId] = useState(mode === 'new' ? 'novo-mapa' : map.id);
  const [size, setSize] = useState<MapSize>(mode === 'new' ? 'medium' : map.size);
  const [nameEn, setNameEn] = useState(mode === 'new' ? '' : map.name.en);
  const [namePt, setNamePt] = useState(mode === 'new' ? '' : map.name['pt-BR']);
  const [descriptionEn, setDescriptionEn] = useState(mode === 'new' ? '' : map.description.en);
  const [descriptionPt, setDescriptionPt] = useState(mode === 'new' ? '' : map.description['pt-BR']);
  const [slot, setSlot] = useState<Slot>(mode === 'new' ? { use: 'skirmish' } : slotOf(map));
  const [setting, setSetting] = useState<SettingLabel>(mode === 'new' ? 'historical-setting-fictional-place' : map.setting.label);
  const [sourceNote, setSourceNote] = useState(mode === 'new' ? '' : map.setting.sourceNote);
  const [palette, setPalette] = useState<MapPalette>(mode === 'new' ? 'temperate' : map.palette);
  const [baseMaterial, setBaseMaterial] = useState<GroundMaterialId>(mode === 'new' ? 'grass' : map.baseMaterial);
  const [waterLevel, setWaterLevel] = useState(mode === 'new' ? 0 : map.waterLevel);
  // author-game-maps 4.3: time of day and sun bearing, previewed live in the view.
  const [light, setLight] = useState<MapLight>(mode === 'new' ? { ...DEFAULT_MAP_LIGHT } : mapLight(map.light));
  const changeLight = (next: MapLight): void => {
    setLight(next);
    props.onPreviewLight(next, north);
  };
  // add-map-compass: true north on the grid, previewed live by the view's arrow and sun.
  const [north, setNorth] = useState(mode === 'new' ? 0 : mapNorth(map.north));
  const changeNorth = (next: number): void => {
    setNorth(next);
    props.onPreviewLight(light, next);
  };
  const [enemyForces, setEnemyForces] = useState<Roster[]>(mode === 'new' ? [] : (map.enemyForces ?? []).map((roster) => ({ sections: [...roster.sections] })));
  const [columnForce, setColumnForce] = useState<Roster | undefined>(mode === 'new' || !map.columnForce ? undefined : { sections: [...map.columnForce.sections] });
  const [epiloguePt, setEpiloguePt] = useState(mode === 'new' ? '' : (map.epilogue?.['pt-BR'] ?? ''));
  // add-withdrawal-exits 6.1: the requirement, edited while the map has exits.
  const [required, setRequired] = useState(map.withdrawal?.requirement.sections ?? 1);
  const [requireCommand, setRequireCommand] = useState(map.withdrawal?.requirement.command ?? false);
  const [epilogueEn, setEpilogueEn] = useState(mode === 'new' ? '' : (map.epilogue?.en ?? ''));
  const valid = isValidMapId(id);
  const outside = mode === 'properties' && size !== map.size ? resizeEditableMap(map, size).outside : [];

  const submit = (): void => {
    if (!valid) return;
    const fields = {
      id,
      name: { en: nameEn, 'pt-BR': namePt },
      description: { en: descriptionEn, 'pt-BR': descriptionPt },
      use: slot.use as MapUse,
      mission: slot.use === 'campaign' ? slot.mission : undefined,
      setting: { label: setting, sourceNote },
      palette,
      baseMaterial,
      waterLevel,
      light,
      // Saved only when turned: the top edge is north by default.
      north: north === 0 ? undefined : north,
      // An empty preset is dropped; none at all leaves the field out (the default roster).
      enemyForces: enemyForces.some((roster) => roster.sections.length > 0) ? enemyForces.filter((roster) => roster.sections.length > 0) : undefined,
      columnForce,
      // Both texts empty: the field is left out.
      epilogue: epiloguePt.trim() || epilogueEn.trim() ? { 'pt-BR': epiloguePt.trim(), en: epilogueEn.trim() } : undefined,
      withdrawal: mode === 'properties' && map.withdrawal ? { ...map.withdrawal, requirement: { sections: Math.max(1, Math.round(required)), command: requireCommand } } : undefined,
    };
    if (mode === 'new') {
      const created = createEditableMap({ id, size, baseMaterial, palette, use: slot.use, mission: slot.use === 'campaign' ? slot.mission : undefined });
      props.onCreate({ ...created, ...fields });
      return;
    }
    if (outside.length > 0) {
      const names = outside.map((objectId) => {
        const type = map.objects.find((object) => object.id === objectId)?.type ?? '';
        return catalogObject(type) ? t(`editor.object.${type}`) : type;
      });
      if (!window.confirm(t('editor.map.resizeWarn', { list: names.join(', ') }))) return;
    }
    const resized = resizeEditableMap(map, size).map;
    props.onApply({ ...resized, ...fields });
  };

  return (
    <div className="editor-dialog" role="dialog" aria-modal="true" aria-label={t(mode === 'new' ? 'editor.file.new' : 'editor.file.properties')}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h2>{t(mode === 'new' ? 'editor.file.new' : 'editor.file.properties')}</h2>
        {mode === 'new' ? <p className="editor-hint">{t('editor.map.discardWarn')}</p> : null}
        <SlotSelect value={slot} onChange={setSlot} maps={props.maps} selfId={mode === 'new' ? null : map.id} lockFilled={mode === 'properties'} locale={props.locale} t={t} />
        {slot.use === 'campaign' ? <p className="editor-hint" data-testid="map-slot-hint">{t('editor.slot.campaignHint')}</p> : null}
        <label>
          {t('editor.map.id')}
          <input data-testid="map-id" value={id} aria-invalid={!valid} onChange={(event) => setId(event.target.value.trim())} />
        </label>
        <label>
          {t('editor.map.size')}
          <select data-testid="map-size" value={size} onChange={(event) => setSize(event.target.value as MapSize)}>
            {MAP_SIZES.map((entry) => (
              <option key={entry} value={entry}>{t(`editor.map.size.${entry}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('editor.map.nameEn')}
          <input data-testid="map-name-en" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
        </label>
        <label>
          {t('editor.map.namePt')}
          <input data-testid="map-name-pt" value={namePt} onChange={(event) => setNamePt(event.target.value)} />
        </label>
        <label>
          {t('editor.map.descriptionEn')}
          <textarea value={descriptionEn} rows={2} onChange={(event) => setDescriptionEn(event.target.value)} />
        </label>
        <label>
          {t('editor.map.descriptionPt')}
          <textarea value={descriptionPt} rows={2} onChange={(event) => setDescriptionPt(event.target.value)} />
        </label>
        <label>
          {t('editor.map.setting')}
          <select value={setting} onChange={(event) => setSetting(event.target.value as SettingLabel)}>
            {SETTINGS.map((entry) => (
              <option key={entry} value={entry}>{t(`editor.map.setting.${entry}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('editor.map.sourceNote')}
          <textarea data-testid="map-source" value={sourceNote} rows={2} onChange={(event) => setSourceNote(event.target.value)} />
        </label>
        <label>
          {t('editor.map.palette')}
          <select value={palette} onChange={(event) => setPalette(event.target.value as MapPalette)}>
            {PALETTES.map((entry) => (
              <option key={entry} value={entry}>{t(`editor.map.palette.${entry}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('editor.map.baseMaterial')}
          <select value={baseMaterial} onChange={(event) => setBaseMaterial(event.target.value as GroundMaterialId)}>
            {GROUND_MATERIAL_IDS.map((entry) => (
              <option key={entry} value={entry}>{t(`editor.material.${entry}`)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('editor.prop.waterLevel')}
          <input type="number" step={0.1} min={-12} max={40} value={waterLevel} onChange={(event) => setWaterLevel(Number(event.target.value))} />
        </label>
        <fieldset className="editor-light" data-testid="map-light">
          <legend>{t('editor.light.title')}</legend>
          <label>
            {t('editor.light.time', { time: lightClock(light.time) })}
            <input
              type="range"
              data-testid="map-light-time"
              min={MAP_LIGHT_TIME.min}
              max={MAP_LIGHT_TIME.max}
              step={0.5}
              value={light.time}
              onChange={(event) => changeLight({ ...light, time: Number(event.target.value) })}
            />
          </label>
          <label>
            {t('editor.light.bearing', { bearing: Math.round(light.bearing), direction: t(`editor.light.compass.${compassPoint(light.bearing)}`) })}
            <input
              type="range"
              data-testid="map-light-bearing"
              min={0}
              max={355}
              step={5}
              value={light.bearing}
              onChange={(event) => changeLight({ ...light, bearing: Number(event.target.value) })}
            />
          </label>
          <p className="editor-hint">{t('editor.light.hint')}</p>
        </fieldset>
        <fieldset className="editor-light" data-testid="map-north">
          <legend>{t('editor.north.title')}</legend>
          <label>
            {t('editor.north.bearing', { bearing: Math.round(north), direction: t(`editor.light.compass.${compassPoint(360 - north)}`) })}
            <input type="range" data-testid="map-north-bearing" min={0} max={355} step={5} value={north} onChange={(event) => changeNorth(Number(event.target.value))} />
          </label>
          <p className="editor-hint">{t('editor.north.hint')}</p>
        </fieldset>
        <ColumnForce force={columnForce} onChange={setColumnForce} t={t} />
        {mode === 'properties' && map.withdrawal ? (
          <fieldset className="editor-enemy" data-testid="map-withdrawal">
            <legend>{t('editor.withdrawal.title')}</legend>
            <p className="editor-hint">{t('editor.withdrawal.hint')}</p>
            <label>
              {t('editor.withdrawal.sections')}
              <input type="number" data-testid="map-withdrawal-sections" min={1} max={ROSTER_MAX_SECTIONS} step={1} value={required} onChange={(event) => setRequired(Number(event.target.value) || 1)} />
            </label>
            <label>
              <input type="checkbox" data-testid="map-withdrawal-command" checked={requireCommand} onChange={(event) => setRequireCommand(event.target.checked)} />
              {t('editor.withdrawal.command')}
            </label>
          </fieldset>
        ) : null}
        <EnemyForces presets={enemyForces} onChange={setEnemyForces} t={t} />
        <fieldset className="editor-enemy" data-testid="map-epilogue">
          <legend>{t('editor.epilogue.title')}</legend>
          <p className="editor-hint">{t('editor.epilogue.hint')}</p>
          <label>
            {t('editor.epilogue.pt')}
            <textarea data-testid="map-epilogue-pt" value={epiloguePt} rows={4} onChange={(event) => setEpiloguePt(event.target.value)} />
          </label>
          <label>
            {t('editor.epilogue.en')}
            <textarea data-testid="map-epilogue-en" value={epilogueEn} rows={4} onChange={(event) => setEpilogueEn(event.target.value)} />
          </label>
        </fieldset>
        <div className="editor-row">
          <button type="button" onClick={props.onClose}>{t('editor.map.close')}</button>
          <button type="submit" className="editor-primary" data-testid="map-submit" disabled={!valid}>{t(mode === 'new' ? 'editor.map.create' : 'editor.map.apply')}</button>
        </div>
      </form>
    </div>
  );
}
