import { lazy, Suspense, useState } from 'react';
import type { Locale } from '@prestes/content';
import { useGramophone } from '../../hooks/useGramophone';
import { MarchingScene } from '../MarchingScene';
import { PixelVideo } from '../PixelVideo';
import { MenuDesk } from './MenuDesk';
// The setup screen opens on demand: its own chunk keeps the start screen's bundle within budget.
const SkirmishSetup = lazy(() =>
  import('./SkirmishSetup').then((module) => ({ default: module.SkirmishSetup })),
);
import type { SkirmishSetup as Setup } from './setupState';

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
        onOpenSetup={() => setSetupOpen(true)}
        onToggleAudio={onToggleAudio}
        gramophone={gramophone}
      />
      {setupOpen ? (
        <Suspense fallback={null}>
          <SkirmishSetup
            locale={locale}
            setup={setup}
            onChange={onSetupChange}
            onStart={onStartBattle3v3}
            onBack={() => setSetupOpen(false)}
          />
        </Suspense>
      ) : null}
    </main>
  );
}
