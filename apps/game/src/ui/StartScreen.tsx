import { useRef, type KeyboardEvent } from 'react';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { Book, Languages, Restart, SoundOff, SoundOn, Troop as Users } from './icons';
import { MarchingScene } from './MarchingScene';

export interface StartScreenProps {
  locale: Locale;
  /** Station to resume (1-based) when unfinished bootcamp progress exists. */
  resumeStation: number | null;
  totalStations: number;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStart: () => void;
  onRestart: () => void;
  /** Starts the 3 vs 3 battle (battle-feel-3v3). */
  onStartBattle3v3: () => void;
  onToggleAudio: () => void;
  onToggleCodex: () => void;
}

/**
 * The main menu: the column marching at dusk behind a classic vertical menu.
 * The arrow keys move between entries (the ▶ cursor follows focus and hover)
 * and Enter chooses.
 */
export function StartScreen({
  locale,
  resumeStation,
  totalStations,
  audioMuted,
  onLocaleChange,
  onStart,
  onRestart,
  onStartBattle3v3,
  onToggleAudio,
  onToggleCodex,
}: StartScreenProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const listRef = useRef<HTMLUListElement | null>(null);

  const moveFocus = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('.menu-entry') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
    event.preventDefault();
  };

  return (
    <main className="start-screen menu-screen" data-testid="start-screen">
      <MarchingScene className="menu-scene" />
      <div className="menu-vignette" aria-hidden="true" />

      <header className="menu-title">
        <p className="eyebrow">{t('app.subtitle')}</p>
        <h1>{t('app.title')}</h1>
      </header>

      <nav className="start-card menu-card" aria-label={t('app.title')}>
        <ul className="menu-list" ref={listRef} onKeyDown={moveFocus}>
          {resumeStation === null ? (
            <li>
              <button type="button" className="menu-entry primary" onClick={onStart} data-testid="start-button" autoFocus>
                {t('start.bootcamp')}
              </button>
            </li>
          ) : (
            <>
              <li>
                <button type="button" className="menu-entry primary" onClick={onStart} data-testid="start-continue" autoFocus>
                  {t('start.continue', { station: resumeStation, total: totalStations })}
                </button>
              </li>
              <li>
                <button type="button" className="menu-entry" onClick={onRestart} data-testid="start-restart">
                  <Restart aria-hidden="true" size={16} />
                  {t('start.restart')}
                </button>
              </li>
            </>
          )}
          <li>
            <button type="button" className="menu-entry" onClick={onStartBattle3v3} data-testid="start-battle-3v3">
              <Users aria-hidden="true" size={16} />
              {t('start.battle3v3')}
            </button>
          </li>
          <li>
            <button type="button" className="menu-entry" onClick={onToggleCodex} data-testid="start-codex">
              <Book aria-hidden="true" size={16} />
              {t('start.codex')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="menu-entry"
              onClick={onToggleAudio}
              aria-pressed={!audioMuted}
              data-testid="start-audio"
            >
              {audioMuted ? <SoundOff aria-hidden="true" size={16} /> : <SoundOn aria-hidden="true" size={16} />}
              {audioMuted ? t('start.audioOff') : t('start.audioOn')}
            </button>
          </li>
          <li>
            <label className="menu-entry menu-language">
              <Languages aria-hidden="true" size={16} />
              <span>{t('start.language')}</span>
              <select
                value={locale}
                onChange={(event) => onLocaleChange(event.target.value as Locale)}
                data-testid="language-select"
              >
                <option value="en">{t('language.en')}</option>
                <option value="pt-BR">{t('language.ptBR')}</option>
              </select>
            </label>
          </li>
        </ul>
      </nav>

      <p className="footer-note menu-footer">{t('start.footer')}</p>
    </main>
  );
}
