import { useEffect, useRef } from 'react';
import { translate, type Locale, type MessageKey } from '@prestes/content';

export interface ContentWarningProps {
  locale: Locale;
  /** Closes the warning; `curses` false also turns the soldiers' swearing off. */
  onContinue: (curses: boolean) => void;
}

/**
 * ambient-sound-and-voices D11: the content warning on the first opening,
 * over the camp table and before any of its objects can be used. A parchment
 * sheet like the options screen, with two ways on: as is, or without the
 * soldiers' swearing.
 */
export function ContentWarning({ locale, onContinue }: ContentWarningProps) {
  const t = (key: MessageKey) => translate(locale, key);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <div className="content-warning" role="dialog" aria-modal="true" aria-labelledby="content-warning-title" data-testid="content-warning">
      <div className="content-warning-sheet">
        <header>
          <p className="desk-book-eyebrow">{t('warning.eyebrow')}</p>
          <h2 id="content-warning-title" className="desk-book-heading">
            {t('warning.heading')}
          </h2>
        </header>
        <p className="desk-text">{t('warning.war')}</p>
        <p className="desk-text">{t('warning.language')}</p>
        <p className="desk-text">{t('warning.portrayal')}</p>
        <p className="desk-text content-warning-choice">{t('warning.choice')}</p>
        <div className="desk-book-actions content-warning-actions">
          <button
            ref={continueRef}
            type="button"
            className="desk-entry primary"
            onClick={() => onContinue(true)}
            data-testid="content-warning-continue"
          >
            {t('warning.continue')}
          </button>
          <button type="button" className="desk-entry" onClick={() => onContinue(false)} data-testid="content-warning-clean">
            {t('warning.continueClean')}
          </button>
        </div>
      </div>
    </div>
  );
}
