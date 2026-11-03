import { BookOpen, Languages, Play } from 'lucide-react';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import heroImage from '../assets/menu/coluna-prestes.webp';

export interface StartScreenProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onStart: () => void;
  onToggleCodex: () => void;
}

export function StartScreen({
  locale,
  onLocaleChange,
  onStart,
  onToggleCodex,
}: StartScreenProps) {
  const t = (key: MessageKey) => translate(locale, key);

  return (
    <main className="start-screen" data-testid="start-screen">
      <div className="start-backdrop" aria-hidden="true">
        <img src={heroImage} alt="" />
      </div>
      <div className="start-scrim" aria-hidden="true" />
      <div className="start-grain" aria-hidden="true" />
      <div className="start-light" aria-hidden="true" />
      <section className="start-card">
        <p className="eyebrow">{t('app.subtitle')}</p>
        <h1>{t('app.title')}</h1>
        <div className="start-actions">
          <button type="button" className="primary" onClick={onStart} data-testid="start-button">
            <Play aria-hidden="true" size={18} />
            {t('start.bootcamp')}
          </button>

          <label className="field">
            <span>
              <Languages aria-hidden="true" size={14} />
              {t('start.language')}
            </span>
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
              data-testid="language-select"
            >
              <option value="en">{t('language.en')}</option>
              <option value="pt-BR">{t('language.ptBR')}</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            onClick={onToggleCodex}
            data-testid="start-codex"
          >
            <BookOpen aria-hidden="true" size={16} />
            {t('start.codex')}
          </button>
        </div>
        <p className="footer-note">{t('start.footer')}</p>
      </section>
      <p className="start-hero-caption">{t('start.heroCaption')}</p>
    </main>
  );
}

