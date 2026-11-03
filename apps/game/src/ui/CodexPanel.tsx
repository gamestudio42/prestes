import { FIGURES, translate, type Locale, type MessageKey } from '@prestes/content';

export interface CodexPanelProps {
  locale: Locale;
  onClose: () => void;
}

export function CodexPanel({ locale, onClose }: CodexPanelProps) {
  const t = (key: MessageKey) => translate(locale, key);

  return (
    <section className="codex" data-testid="codex" aria-label={t('codex.title')}>
      <header className="codex-header">
        <h2>{t('codex.title')}</h2>
        <button type="button" className="secondary" onClick={onClose}>
          {t('codex.close')}
        </button>
      </header>
      <ul className="codex-list">
        {FIGURES.map((figure) => (
          <li key={figure.id} className="codex-entry">
            <h3>{figure.displayName}</h3>
            <p>{t(figure.roleKey)}</p>
            <p className="codex-labels">
              {figure.labels.map((label) => (
                <span key={label} data-testid={`codex-label-${label}`}>
                  {t(`codex.${label}` as MessageKey)}
                </span>
              ))}
            </p>
            <p className="codex-sources">
              {t('codex.sources')}: {figure.sourceRefs.join(', ')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
