import { lazy, Suspense, useEffect, useState } from 'react';
import { loadSkirmishMaps, type BattleMap } from '@prestes/shared';
import type { Locale } from '@prestes/content';
import type { CampaignProgress } from '../../campaign/progress';
import { useGramophone } from '../../hooks/useGramophone';
import campTable from '../../assets/menu/camp-table.png';
import { MenuDesk } from './MenuDesk';
// The setup screen opens on demand: its own chunk keeps the start screen's bundle within budget.
const SkirmishSetup = lazy(() =>
  import('./SkirmishSetup').then((module) => ({ default: module.SkirmishSetup })),
);
import { withMap, type SkirmishSetup as Setup } from './setupState';

/** The camp table's art size (tools/menu/camp_pieces.py); CSS covers the view with it. */
const CAMP_TABLE = { width: 887, height: 442 } as const;

export interface StartScreenDeskProps {
  locale: Locale;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStartBattle3v3: () => void;
  /** make-campaign-playable: the kept progress, the chapter the book reopens at, and its actions. */
  campaignProgress: CampaignProgress;
  campaignChapter: string | null;
  onPlayChapter: (chapterId: string) => void;
  onRestartCampaign: () => void;
  /** pre-battle-roster 5.1: the skirmish setup the desk's map opens. */
  setup: Setup;
  onSetupChange: (setup: Setup) => void;
  onToggleAudio: () => void;
}

/**
 * The start screen (camp-tent-menu): a camp table under a tent at dusk, with
 * the menu laid out on it as draggable period objects.
 */
export function StartScreenDesk({
  locale,
  audioMuted,
  onLocaleChange,
  onStartBattle3v3,
  campaignProgress,
  campaignChapter,
  onPlayChapter,
  onRestartCampaign,
  setup,
  onSetupChange,
  onToggleAudio,
}: StartScreenDeskProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const gramophone = useGramophone({ muted: audioMuted, onEnableSound: onToggleAudio });
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
      <img
        className="menu-scene camp-scene"
        src={campTable}
        width={CAMP_TABLE.width}
        height={CAMP_TABLE.height}
        alt=""
        draggable={false}
        data-testid="camp-scene"
      />

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
        campaignProgress={campaignProgress}
        campaignChapter={campaignChapter}
        onPlayChapter={onPlayChapter}
        onRestartCampaign={onRestartCampaign}
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
