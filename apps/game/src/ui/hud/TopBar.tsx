import { Box, Camera, Code2, Contrast, Languages, Pause, Play } from 'lucide-react';
import type { Locale } from '@prestes/content';
import type { CameraBand } from '@prestes/view3d';
import type { Frame, Outcome } from '@prestes/shared';
import { IconButton } from './IconButton';
import type { Translate } from './orderMeta';

interface TopBarProps {
  t: Translate;
  locale: Locale;
  frame: Frame | null;
  band: CameraBand;
  postStrong: boolean;
  outcome: Outcome;
  speed: 0 | 1 | 2 | 4;
  sandboxOpen: boolean;
  onLocaleChange: (locale: Locale) => void;
  onCameraBand: (band: CameraBand) => void;
  onSetSpeed: (speed: 0 | 1 | 2 | 4) => void;
  onTogglePause: () => void;
  onTogglePost: () => void;
  onToggleSandbox: () => void;
  onToggleCodex: () => void;
}

export function TopBar({
  t,
  locale,
  frame,
  band,
  postStrong,
  outcome,
  speed,
  sandboxOpen,
  onLocaleChange,
  onCameraBand,
  onSetSpeed,
  onTogglePause,
  onTogglePost,
  onToggleSandbox,
  onToggleCodex,
}: TopBarProps) {
  const bandKey =
    band === 'strategic' ? 'hud.strategic' : band === 'tactical' ? 'hud.tactical' : 'hud.transition';
  const postKey = postStrong ? 'hud.postStrong' : 'hud.postClean';
  const outcomeKey =
    outcome === 'victory' ? 'hud.victory' : outcome === 'defeat' ? 'hud.defeat' : 'hud.playing';

  return (
    <header className="hud-top" data-testid="hud">
      <div className="hud-rail brand-rail">
        <div className="hud-brand">
          {t('app.title')}
          <span className="hud-eyebrow">{t('hud.commandBar')}</span>
        </div>
      </div>

      <div className="hud-rail stat-rail">
        <span data-testid="tick-value">
          {t('hud.tick')}: {frame?.tick ?? 0}
        </span>
        <span data-testid="path-count">
          {t('hud.paths')}: {frame?.orders.length ?? 0}
        </span>
        <span data-testid="outcome">
          {t('hud.outcome')}: {t(outcomeKey)}
        </span>
      </div>

      <div className="hud-rail camera-rail">
        <span className="hud-band-value" data-testid="band-value">
          {t('hud.band')}: {t(bandKey)}
        </span>
        <Camera aria-hidden="true" size={15} className="camera-icon" />
        <div className="camera-segmented">
          <button
            type="button"
            className={band === 'tactical' ? 'active' : ''}
            onClick={() => onCameraBand('tactical')}
            aria-pressed={band === 'tactical'}
            data-testid="camera-tactical"
          >
            {t('hud.tactical')}
          </button>
          <button
            type="button"
            className={band === 'strategic' ? 'active' : ''}
            onClick={() => onCameraBand('strategic')}
            aria-pressed={band === 'strategic'}
            data-testid="camera-strategic"
          >
            {t('hud.strategic')}
          </button>
        </div>
      </div>

      <div className="hud-actions">
        <label className="language-control">
          <Languages aria-hidden="true" size={15} />
          <select
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
            title={t('hud.language')}
            data-testid="hud-language-select"
          >
            <option value="en">{t('language.en')}</option>
            <option value="pt-BR">{t('language.ptBR')}</option>
          </select>
        </label>
        <IconButton
          testId="sandbox-toggle"
          label={t('hud.sandbox')}
          description={t('hud.tip.sandbox')}
          onClick={onToggleSandbox}
          active={sandboxOpen}
          className="hud-icon"
        >
          <Box aria-hidden="true" size={15} />
        </IconButton>
        <IconButton
          testId="codex-toggle"
          label={t('hud.codex')}
          description={t('hud.tip.codex')}
          onClick={onToggleCodex}
          className="hud-icon"
        >
          <Code2 aria-hidden="true" size={15} />
        </IconButton>
        <div className="speed-control">
          <IconButton
            testId="pause-button"
            label={speed === 0 ? t('hud.resume') : t('hud.pause')}
            description={t('hud.tip.pause')}
            onClick={onTogglePause}
            className="hud-icon"
          >
            {speed === 0 ? (
              <Play aria-hidden="true" size={15} />
            ) : (
              <Pause aria-hidden="true" size={15} />
            )}
          </IconButton>
          {([1, 2, 4] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`speed-button ${speed === value ? 'active' : ''}`}
              onClick={() => onSetSpeed(value)}
              title={t('hud.tip.speed')}
              aria-label={value === 1 ? '0.5x' : value === 2 ? '1x' : '2x'}
              data-testid={`speed-${value}`}
            >
              {value === 1 ? '0.5x' : value === 2 ? '1x' : '2x'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="post-button"
          onClick={onTogglePost}
          title={t('hud.tip.post')}
          data-testid="post-mode"
        >
          <Contrast aria-hidden="true" size={15} />
          <span>
            {t('hud.post')}: {t(postKey)}
          </span>
        </button>
      </div>
    </header>
  );
}
