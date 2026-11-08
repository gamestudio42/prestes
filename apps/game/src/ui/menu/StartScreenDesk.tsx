import { useState } from 'react';
import type { BattleMapId } from '@prestes/shared';
import type { Locale } from '@prestes/content';
import { useGramophone } from '../../hooks/useGramophone';
import { MarchingScene } from '../MarchingScene';
import { PixelVideo } from '../PixelVideo';
import { MenuDesk } from './MenuDesk';

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/menu-book.mp4`;

export interface StartScreenDeskProps {
  locale: Locale;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStartBattle3v3: () => void;
  battleMap: BattleMapId;
  onBattleMapChange: (map: BattleMapId) => void;
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
  battleMap,
  onBattleMapChange,
  onToggleAudio,
}: StartScreenDeskProps) {
  const gramophone = useGramophone({ muted: audioMuted, onEnableSound: onToggleAudio });
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <main className="start-screen menu-screen desk-screen" data-testid="start-screen">
      {videoFailed ? (
        <MarchingScene className="menu-scene" />
      ) : (
        <PixelVideo src={VIDEO_SRC} width={320} className="menu-scene" onError={() => setVideoFailed(true)} />
      )}
      <div className="menu-vignette" aria-hidden="true" />

      <MenuDesk
        locale={locale}
        audioMuted={audioMuted}
        onLocaleChange={onLocaleChange}
        onStartBattle3v3={onStartBattle3v3}
        battleMap={battleMap}
        onBattleMapChange={onBattleMapChange}
        onToggleAudio={onToggleAudio}
        gramophone={gramophone}
      />
    </main>
  );
}
