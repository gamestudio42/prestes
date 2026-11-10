import { lazy, Suspense, useEffect, useState } from 'react';
import { loadSkirmishMaps, type BattleMap } from '@prestes/shared';
import type { Locale } from '@prestes/content';
import { useGramophone } from '../../hooks/useGramophone';
import { MarchingScene } from '../MarchingScene';
import { PixelVideo } from '../PixelVideo';
import { MenuDesk } from './MenuDesk';
// The setup screen opens on demand: its own chunk keeps the start screen's bundle within budget.
const SkirmishSetup = lazy(() =>
  import('./SkirmishSetup').then((module) => ({ default: module.SkirmishSetup })),
);
import { withMap, type SkirmishSetup as Setup } from './setupState';

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/menu-book.mp4`;

export interface StartScreenDeskProps {
  locale: Locale;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStartBattle3v3: () => void;
  /** pre-battle-roster 5.1: the skirmish setup the desk's map opens. */
  setup: Setup;
  onSetupChange: (setup: Setup) => void;
  onToggleAudio: () => void;
}

/**
 * The start screen: the pixel scene and the gramophone, with the menu laid out
 * as draggable period objects on a desk.
 */
export function StartScreenDesk({
  locale,
  audioMuted,
  onLocaleChange,
  onStartBattle3v3,
  setup,
  onSetupChange,
  onToggleAudio,
}: StartScreenDeskProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const gramophone = useGramophone({ muted: audioMuted, onEnableSound: onToggleAudio });
  const [videoFailed, setVideoFailed] = useState(false);
  // author-game-maps 5.2: the authored skirmish maps; the test map only on the dev server.
  const [maps, setMaps] = useState<readonly BattleMap[]>([]);
  useEffect(() => {
    let live = true;
    void loadSkirmishMaps({ includeTest: import.meta.env.DEV }).then((loaded) => {
      if (live) setMaps(loaded);
    });
    return () => {
      live = false;
    };
  }, []);
  // A remembered map that is no longer on the desk gives way to the first one.
  useEffect(() => {
    if (maps.length > 0 && !maps.some((map) => map.id === setup.map)) onSetupChange(withMap(setup, maps[0]!.id));
  }, [maps, setup, onSetupChange]);
  const selectMap = (map: string): void => {
    if (map !== setup.map) onSetupChange(withMap(setup, map));
  };

  return (
    <main className="start-screen menu-screen desk-screen" data-testid="start-screen">
      {videoFailed ? (
        <MarchingScene className="menu-scene" />
      ) : (
        <PixelVideo
          src={VIDEO_SRC}
          width={320}
          className="menu-scene"
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="menu-vignette" aria-hidden="true" />

      <MenuDesk
        locale={locale}
        audioMuted={audioMuted}
        onLocaleChange={onLocaleChange}
        battleMap={setup.map}
        maps={maps}
        onSelectMap={selectMap}
        onOpenSetup={(map) => {
          selectMap(map);
          setSetupOpen(true);
        }}
        onToggleAudio={onToggleAudio}
        gramophone={gramophone}
      />
      {setupOpen && maps.length > 0 ? (
        <Suspense fallback={null}>
          <SkirmishSetup
            locale={locale}
            setup={setup}
            maps={maps}
            onChange={onSetupChange}
            onStart={onStartBattle3v3}
            onBack={() => setSetupOpen(false)}
          />
        </Suspense>
      ) : null}
    </main>
  );
}
