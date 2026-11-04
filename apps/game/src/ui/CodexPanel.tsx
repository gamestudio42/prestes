import { useState } from 'react';
import {
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  FIGURES,
  compendiumBodyKey,
  compendiumTitleKey,
  translate,
  type CompendiumEntry,
  type CompendiumSection,
  type Locale,
  type MessageKey,
} from '@prestes/content';
import { Book, Close } from './icons';

export interface CodexPanelProps {
  locale: Locale;
  onClose: () => void;
}

/**
 * The compendium of the Coluna Prestes as a pixel field book: a tab per
 * section, the entries on the left page and the open entry on the right, with
 * its source line and confidence.
 */
export function CodexPanel({ locale, onClose }: CodexPanelProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const [section, setSection] = useState<CompendiumSection>('figures');
  const entries = COMPENDIUM.filter((entry) => entry.section === section);
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);
  const open: CompendiumEntry | undefined =
    entries.find((entry) => entry.id === openId) ?? entries[0];
  const figure = open ? FIGURES.find((entry) => entry.id === open.id) : undefined;

  const pickSection = (next: CompendiumSection) => {
    setSection(next);
    setOpenId(COMPENDIUM.find((entry) => entry.section === next)?.id ?? null);
  };

  return (
    <section className="codex codex-book" data-testid="codex" aria-label={t('compendium.title')}>
      <header className="codex-header">
        <Book size={16} />
        <h2>{t('compendium.title')}</h2>
        <button type="button" className="secondary codex-close" onClick={onClose} aria-label={t('codex.close')}>
          <Close size={16} />
          <span>{t('codex.close')}</span>
        </button>
      </header>

      <nav className="codex-tabs" role="tablist" aria-label={t('compendium.title')}>
        {COMPENDIUM_SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`codex-tab ${section === id ? 'active' : ''}`}
            data-testid={`codex-tab-${id}`}
            onClick={() => pickSection(id)}
          >
            {t(`compendium.section.${id}` as MessageKey)}
          </button>
        ))}
      </nav>

      <div className="codex-pages">
        <ol className="codex-index" data-testid="codex-index" aria-label={t('compendium.count', { count: entries.length })}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={`codex-index-entry ${open?.id === entry.id ? 'active' : ''}`}
                data-testid={`codex-entry-${entry.id}`}
                aria-current={open?.id === entry.id ? 'true' : undefined}
                onClick={() => setOpenId(entry.id)}
              >
                {entry.date ? <span className="codex-date">{entry.date.slice(0, 7)}</span> : null}
                <span>{t(compendiumTitleKey(entry))}</span>
              </button>
            </li>
          ))}
        </ol>

        {open ? (
          <article className="codex-page" data-testid="codex-page" data-entry={open.id}>
            {open.date ? <p className="codex-date">{open.date}</p> : null}
            <h3>{t(compendiumTitleKey(open))}</h3>
            {figure ? (
              <p className="codex-labels">
                {figure.labels.map((label) => (
                  <span key={label} data-testid={`codex-label-${label}`}>
                    {t(`codex.${label}` as MessageKey)}
                  </span>
                ))}
              </p>
            ) : null}
            <p className="codex-body">{t(compendiumBodyKey(open))}</p>
            <p className="codex-sources" data-testid="codex-source">
              {t('compendium.source')}: {open.cite} · {open.sourceRefs.join(', ')}
            </p>
            <p className={`codex-confidence confidence-${open.confidence}`} data-testid="codex-confidence">
              {t('compendium.confidence')}: {t(`compendium.confidence.${open.confidence}` as MessageKey)}
            </p>
          </article>
        ) : (
          <p className="codex-page codex-empty">{t('compendium.pick')}</p>
        )}
      </div>
    </section>
  );
}
