import { Camera, PostEffect as Contrast, Eye, EyeOff, Languages, Pause, Play } from '../icons';
import type { Locale } from '@prestes/content';
import type { ObjectiveSnapshot } from '@prestes/shared';
import type { CameraBand } from '@prestes/view3d';
import { IconButton } from './IconButton';
import { ICONS } from './orderMeta';
import type { Translate } from './orderMeta';

interface TopBarProps {
  t: Translate;
  locale: Locale;
  band: CameraBand;
  postStrong: boolean;
  routesVisible: boolean;
  speed: 0 | 1 | 2 | 4 | 8;
  sandboxOpen: boolean;
  /** add-deployment-phase 3.1: no time passes in deployment, so the speed controls are hidden. */
  deploying?: boolean;
  /** add-map-objectives 3.2: the objectives and the battle clock, on maps with objectives. */
  objectives?: readonly ObjectiveSnapshot[];
  clock?: { tick: number; limit: number };
  onLocaleChange: (locale: Locale) => void;
  onCameraBand: (band: CameraBand) => void;
  onSetSpeed: (speed: 0 | 1 | 2 | 4 | 8) => void;
  onTogglePause: () => void;
  onTogglePost: () => void;
  onToggleRoutes: () => void;
  onToggleSandbox: () => void;
  /** refine-battle-controls: leave the battle for the desk, after a confirmation. */
  onLeave: () => void;
}

const SPEED_LABEL = { 1: '0.5x', 2: '1x', 4: '2x', 8: '4x' } as const;

export function TopBar({
  t,
  locale,
  band,
  postStrong,
  routesVisible,
  speed,
  sandboxOpen,
  deploying = false,
  objectives = [],
  clock,
  onLocaleChange,
  onCameraBand,
  onSetSpeed,
  onTogglePause,
  onTogglePost,
  onToggleRoutes,
  onToggleSandbox,
  onLeave,
}: TopBarProps) {
  const bandKey =
    band === 'strategic' ? 'hud.strategic' : band === 'tactical' ? 'hud.tactical' : 'hud.transition';
  const postKey = postStrong ? 'hud.postStrong' : 'hud.postClean';
  const clockLeft = clock === undefined ? null : Math.max(0, Math.ceil((clock.limit - clock.tick) / 10));
  const clockText =
    clockLeft === null ? '' : `${Math.floor(clockLeft / 60)}:${(clockLeft % 60).toString().padStart(2, '0')}`;
  const objectiveName = (objective: ObjectiveSnapshot) => objective.name[locale];

  return (
    <header className="hud-top" data-testid="hud">
      <div className="hud-rail brand-rail">
        <div className="hud-brand">
          {t('app.title')}
          <span className="hud-eyebrow">{t('hud.commandBar')}</span>
        </div>
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

      {objectives.length > 0 ? (
        <div className="hud-rail objective-rail">
          <span className="hud-band-value">{t('hud.objectives')}</span>
          <div className="objective-strip" data-testid="objective-strip">
            {objectives.map((objective) => {
              const tip = t('hud.objectiveTip', { name: objectiveName(objective), value: objective.value });
              return (
                <span
                  key={objective.id}
                  className={`objective-icon ${objective.owner}${objective.contested ? ' contested' : ''}`}
                  data-testid={`objective-icon-${objective.id}`}
                  data-owner={objective.owner}
                  data-contested={objective.contested ? 'true' : 'false'}
                  title={tip}
                  aria-label={`${tip}${objective.contested ? ` (${t('hud.contested')})` : ''}`}
                  role="img"
                >
                  <span className="objective-initial" aria-hidden="true">
                    {objectiveName(objective).slice(0, 1)}
                  </span>
                  <span className="objective-pips" aria-hidden="true">
                    {Array.from({ length: objective.value }, (_, index) => (
                      <i key={index} />
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
          {clockText ? (
            <span className="hud-clock" data-testid="battle-clock" title={t('hud.clock', { time: clockText })}>
              {clockText}
            </span>
          ) : null}
        </div>
      ) : null}

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
          <ICONS.sandbox aria-hidden="true" size={15} />
        </IconButton>
        <button type="button" className="hud-leave" data-testid="leave-battle" onClick={onLeave}>
          {t('hud.leave')}
        </button>
        {deploying ? null : (
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
          {([1, 2, 4, 8] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`speed-button ${speed === value ? 'active' : ''}`}
              onClick={() => onSetSpeed(value)}
              title={t('hud.tip.speed')}
              aria-label={SPEED_LABEL[value]}
              data-testid={`speed-${value}`}
            >
              {SPEED_LABEL[value]}
            </button>
          ))}
        </div>
        )}
        <button
          type="button"
          className="post-button"
          onClick={onToggleRoutes}
          title={t('hud.tip.routes')}
          aria-pressed={routesVisible}
          data-testid="routes-toggle"
        >
          {routesVisible ? <Eye aria-hidden="true" size={15} /> : <EyeOff aria-hidden="true" size={15} />}
          <span>{t('hud.routes')}</span>
        </button>
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
