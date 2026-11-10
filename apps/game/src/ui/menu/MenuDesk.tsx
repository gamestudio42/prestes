import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BattleMap, BattleMapId } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import type { GramophoneState } from '../../audio/Gramophone';
import type { GramophoneTrack } from '../../audio/gramophone-tracks';
import { CampaignBook } from './CampaignBook';
import { CompendiumBook, type CompendiumTarget } from './CompendiumBook';
import { DeskObject } from './DeskObject';
import { GramophoneDesk } from './GramophoneDesk';
import { MAP_EDITOR_URL, MapEditorTheodolite } from './MapEditorTheodolite';
import { OptionsCompass } from './OptionsCompass';
import { ReferencesShelf } from './ReferencesShelf';
import { SkirmishMaps } from './SkirmishMaps';
import {
  DESK_LAYOUT_KEY,
  DESK_OBJECT_IDS,
  clampDesk,
  defaultDeskPosition,
  loadDesk,
  saveDesk,
  type DeskLayout,
  type DeskObjectId,
  type DeskPosition,
  type DeskSize,
} from './deskLayout';

const view = (): DeskSize => ({ w: window.innerWidth, h: window.innerHeight });

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface MenuDeskProps {
  locale: Locale;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  /** The last skirmish map chosen; its sheet lies on the desk. */
  battleMap: BattleMapId;
  /** pre-battle-roster 5.1: the desk's map opens the skirmish setup screen. */
  onOpenSetup: (map: BattleMapId) => void;
  /** author-game-maps 5.2: the skirmish maps on the desk. */
  maps: readonly BattleMap[];
  onSelectMap: (map: BattleMapId) => void;
  onToggleAudio: () => void;
  gramophone: {
    track: GramophoneTrack;
    total: number;
    state: GramophoneState;
    handlePlayPause: () => void;
    handleNext: () => void;
    handlePrevious: () => void;
    handleSelect: (index: number) => void;
  };
}

/**
 * The menu desk: objects laid over the pixel scene, draggable and kept inside
 * the view, with their positions remembered under their own storage key. The
 * desk is an extension point: another change can add an object id and a
 * component without rewriting the shell.
 */
export function MenuDesk({
  locale,
  audioMuted,
  onLocaleChange,
  battleMap,
  onOpenSetup,
  maps,
  onSelectMap,
  onToggleAudio,
  gramophone,
}: MenuDeskProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const [layout, setLayout] = useState<DeskLayout>(() => loadDesk(storage()));
  const [sizes, setSizes] = useState<Partial<Record<DeskObjectId, DeskSize>>>({});
  // Open objects in the order they were opened or touched; the last is in front.
  const [openOrder, setOpenOrder] = useState<readonly DeskObjectId[]>([]);
  const open = useMemo(() => new Set(openOrder), [openOrder]);
  const [front, setFront] = useState<DeskObjectId | null>(null);
  const [compendiumTarget, setCompendiumTarget] = useState<CompendiumTarget | null>(null);

  const commit = useCallback((next: DeskLayout) => {
    setLayout(next);
    saveDesk(storage(), next);
  }, []);

  const handleMeasure = useCallback((id: DeskObjectId, size: DeskSize) => {
    // Only closed sizes arrive here: an open object is an overlay and does not
    // report, so opening never moves or stores a desk position.
    setSizes((previous) => {
      const current = previous[id];
      if (current && current.w === size.w && current.h === size.h) return previous;
      return { ...previous, [id]: size };
    });
  }, []);

  // Give every measured object a place, and pull saved positions back in view
  // (and onto the art grid) after a resize.
  useEffect(() => {
    let changed = false;
    const next: DeskLayout = { ...layout };
    for (const id of DESK_OBJECT_IDS) {
      const size = sizes[id];
      if (!size) continue;
      const position = next[id];
      if (!position) {
        next[id] = defaultDeskPosition(id, size, view());
        changed = true;
      } else {
        const clamped = clampDesk(position, size, view());
        if (clamped.x !== position.x || clamped.y !== position.y) {
          next[id] = clamped;
          changed = true;
        }
      }
    }
    if (changed) commit(next);
  }, [sizes, layout, commit]);

  const move = useCallback(
    (id: DeskObjectId, position: DeskPosition) => {
      const next = { ...layout, [id]: position };
      commit(next);
    },
    [layout, commit],
  );

  const toggle = useCallback((id: DeskObjectId) => {
    setOpenOrder((previous) =>
      previous.includes(id) ? previous.filter((other) => other !== id) : [...previous, id],
    );
    setFront(id);
  }, []);

  const bringFront = useCallback((id: DeskObjectId) => {
    setFront(id);
    setOpenOrder((previous) =>
      previous.includes(id) && previous[previous.length - 1] !== id
        ? [...previous.filter((other) => other !== id), id]
        : previous,
    );
  }, []);

  // A briefing link opens the compendium, or brings it to the front, at an entry.
  const openEntry = useCallback((id: string) => {
    setCompendiumTarget((previous) => ({ id, nonce: (previous?.nonce ?? 0) + 1 }));
    setOpenOrder((previous) => [...previous.filter((other) => other !== 'compendium'), 'compendium']);
    setFront('compendium');
  }, []);

  const openMaps = useCallback(() => {
    setFront('maps');
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-desk-object="maps"] .desk-object-handle')
        ?.focus();
    });
  }, []);

  const openMapEditor = useCallback(() => {
    window.location.assign(MAP_EDITOR_URL);
  }, []);

  const reset = useCallback(() => {
    setOpenOrder([]);
    setFront(null);
    const next: DeskLayout = {};
    const current = view();
    for (const id of DESK_OBJECT_IDS) {
      const size = sizes[id];
      if (size) next[id] = defaultDeskPosition(id, size, current);
    }
    commit(next);
    try {
      storage()?.removeItem(DESK_LAYOUT_KEY);
    } catch {
      // Storage blocked: the session keeps the default arrangement.
    }
  }, [sizes, commit]);

  // Closed objects stack below every open overlay; overlays stack by open order.
  const z = useMemo(() => {
    const order = new Map(DESK_OBJECT_IDS.map((id, index) => [id, 10 + index]));
    return (id: DeskObjectId) => {
      const overlay = id === 'maps' ? -1 : openOrder.indexOf(id);
      if (overlay >= 0) return 60 + overlay;
      return id === front ? 40 : order.get(id) ?? 10;
    };
  }, [front, openOrder]);

  const position = (id: DeskObjectId) => layout[id];

  return (
    <div className="menu-desk" data-testid="menu-desk">
      <DeskObject
        id="campaign"
        name={t('menu.mark.campaign')}
        open={open.has('campaign')}
        position={position('campaign')}
        zIndex={z('campaign')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="menu-mark-campaign"
      >
        <CampaignBook
          locale={locale}
          open={open.has('campaign')}
          onStartSkirmish={openMaps}
          onOpenEntry={openEntry}
        />
      </DeskObject>

      <DeskObject
        id="compendium"
        name={t('menu.cover.campaign')}
        open={open.has('compendium')}
        position={position('compendium')}
        zIndex={z('compendium')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="start-codex"
      >
        <CompendiumBook
          locale={locale}
          open={open.has('compendium')}
          target={compendiumTarget}
        />
      </DeskObject>

      <DeskObject
        id="references"
        name={t('menu.references.title')}
        open={open.has('references')}
        position={position('references')}
        zIndex={z('references')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="menu-mark-references"
      >
        <ReferencesShelf locale={locale} open={open.has('references')} />
      </DeskObject>

      <DeskObject
        id="options"
        name={t('menu.mark.options')}
        open={open.has('options')}
        position={position('options')}
        zIndex={z('options')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="menu-mark-options"
      >
        <OptionsCompass
          locale={locale}
          open={open.has('options')}
          audioMuted={audioMuted}
          onLocaleChange={onLocaleChange}
          onToggleAudio={onToggleAudio}
        />
      </DeskObject>

      <DeskObject
        id="maps"
        name={t('menu.mark.skirmish')}
        open
        toggleable={false}
        position={position('maps')}
        zIndex={z('maps')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="menu-mark-skirmish"
      >
        <SkirmishMaps
          locale={locale}
          maps={maps}
          battleMap={battleMap}
          onOpenSetup={onOpenSetup}
          onSelect={onSelectMap}
        />
      </DeskObject>

      <DeskObject
        id="gramophone"
        name={t('gramophone.title')}
        open={open.has('gramophone')}
        position={position('gramophone')}
        zIndex={z('gramophone')}
        onMove={move}
        onToggle={toggle}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="desk-gramophone-object"
      >
        <GramophoneDesk
          locale={locale}
          open={open.has('gramophone')}
          track={gramophone.track}
          total={gramophone.total}
          state={gramophone.state}
          muted={audioMuted}
          onPlayPause={gramophone.handlePlayPause}
          onNext={gramophone.handleNext}
          onPrevious={gramophone.handlePrevious}
          onSelect={gramophone.handleSelect}
        />
      </DeskObject>

      {/* add-map-editor: the theodolite does not open in place; it goes to the editor page. */}
      <DeskObject
        id="editor"
        name={t('menu.maps.editor')}
        open={false}
        position={position('editor')}
        zIndex={z('editor')}
        onMove={move}
        onToggle={openMapEditor}
        onFront={bringFront}
        onMeasure={handleMeasure}
        openLabel={t('menu.desk.open')}
        closeLabel={t('menu.desk.close')}
        moveLabel={t('menu.desk.move')}
        testId="menu-mark-editor"
      >
        <MapEditorTheodolite locale={locale} />
      </DeskObject>

      <p className="desk-hint" aria-hidden="true">
        {t('menu.desk.hint')}
      </p>
      <button type="button" className="desk-reset" onClick={reset} data-testid="menu-desk-reset">
        {t('menu.desk.reset')}
      </button>
    </div>
  );
}
