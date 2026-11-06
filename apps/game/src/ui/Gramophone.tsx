import { useCallback, useEffect, useRef, useState } from 'react';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import type { GramophoneState } from '../audio/Gramophone';
import type { GramophoneTrack } from '../audio/gramophone-tracks';

export interface GramophoneProps {
  locale: Locale;
  track: GramophoneTrack;
  total: number;
  state: GramophoneState;
  muted: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const CARD_SECONDS = 8000;

/**
 * The menu gramophone: a period cabinet, a record that turns while playing,
 * three transport controls and a transient card with the recording's data.
 * It is fixed below the book and does not take part in the book's focus rings.
 */
export function Gramophone({
  locale,
  track,
  total,
  state,
  muted,
  onPlayPause,
  onNext,
  onPrevious,
}: GramophoneProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const [cardVisible, setCardVisible] = useState(false);
  const firstNonce = useRef(state.changeNonce);
  const hideTimer = useRef<number | null>(null);

  const clearHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setCardVisible(false);
    }, CARD_SECONDS);
  }, [clearHide]);

  useEffect(() => {
    if (state.changeNonce === firstNonce.current) return;
    setCardVisible(true);
    scheduleHide();
    return clearHide;
  }, [state.changeNonce, scheduleHide, clearHide]);

  const status = state.playing ? 'playing' : state.loading ? 'loading' : 'paused';
  const hint = state.error
    ? t('gramophone.unavailable')
    : muted
      ? t('gramophone.mutedHint')
      : !state.started && !state.playing
        ? t('gramophone.startHint')
        : null;

  return (
    <>
      {cardVisible ? (
        <aside
          className="gramophone-card"
          data-testid="gramophone-card"
          aria-live="polite"
          data-no-autoplay
          onMouseEnter={clearHide}
          onMouseLeave={scheduleHide}
          onFocus={clearHide}
          onBlur={scheduleHide}
        >
          <p className="gramophone-card-kicker">{t('gramophone.nowPlaying')}</p>
          <h3 className="gramophone-card-title">{track.title}</h3>
          <dl className="gramophone-card-facts">
            <div>
              <dt>{t('gramophone.composer')}</dt>
              <dd>{track.composer}</dd>
            </div>
            <div>
              <dt>{t('gramophone.performer')}</dt>
              <dd>{track.performer}</dd>
            </div>
            <div>
              <dt>{t('gramophone.year')}</dt>
              <dd>{track.year}</dd>
            </div>
            <div>
              <dt>{t('gramophone.genre')}</dt>
              <dd>{locale === 'en' ? track.genreEn : track.genre}</dd>
            </div>
            <div>
              <dt>{t('gramophone.label')}</dt>
              <dd>{track.label}</dd>
            </div>
            <div>
              <dt>{t('gramophone.catalog')}</dt>
              <dd>{track.catalog}</dd>
            </div>
          </dl>
          <p className="gramophone-card-dp">
            {t('gramophone.publicDomain', { year: track.publicDomainYear })}
          </p>
          <a
            className="gramophone-card-source"
            href={track.source}
            target="_blank"
            rel="noreferrer"
          >
            {t('gramophone.source')}
          </a>
        </aside>
      ) : null}

      <section
        className="gramophone"
        data-testid="gramophone"
        data-playing={state.playing}
        data-state={status}
        aria-label={t('gramophone.title')}
        data-no-autoplay
      >
        <div className="gramophone-body">
          <GramophoneArt />
          <div className="gramophone-info">
            <p className="gramophone-kicker">{t('gramophone.title')}</p>
            <p className="gramophone-subtitle">{t('gramophone.subtitle')}</p>
            <p className="gramophone-track" data-testid="gramophone-title">
              {track.title}
            </p>
            <p className="gramophone-meta">
              {track.composer} ·{' '}
              {t('gramophone.trackCount', { current: state.trackIndex + 1, total })}
            </p>
          </div>
        </div>
        <div className="gramophone-controls">
          <button
            type="button"
            className="gramophone-button"
            onClick={onPrevious}
            aria-label={t('gramophone.previous')}
            title={t('gramophone.previous')}
            data-testid="gramophone-previous"
          >
            <TransportIcon kind="previous" />
          </button>
          <button
            type="button"
            className="gramophone-button gramophone-button-play"
            onClick={onPlayPause}
            aria-label={state.playing ? t('gramophone.pause') : t('gramophone.play')}
            title={state.playing ? t('gramophone.pause') : t('gramophone.play')}
            aria-pressed={state.playing}
            data-testid="gramophone-play"
            data-state={status}
          >
            <TransportIcon kind={state.playing ? 'pause' : 'play'} />
          </button>
          <button
            type="button"
            className="gramophone-button"
            onClick={onNext}
            aria-label={t('gramophone.next')}
            title={t('gramophone.next')}
            data-testid="gramophone-next"
          >
            <TransportIcon kind="next" />
          </button>
        </div>
        {hint ? (
          <p className="gramophone-hint" role="status">
            {hint}
          </p>
        ) : null}
      </section>
    </>
  );
}

/** The cabinet, horn and record; the record turns only while a track plays. */
function GramophoneArt() {
  return (
    <svg
      className="gramophone-art"
      viewBox="0 0 84 84"
      width="84"
      height="84"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="60,52 64,24 70,18 78,6 84,8 80,24 72,30 68,54" fill="#a8873f" />
      <polygon points="64,24 70,18 78,6 84,8 80,24 72,30" fill="#e0b85a" />
      <polygon points="73,12 79,8 81,14 76,19" fill="#1b140d" />
      <rect x="8" y="62" width="68" height="18" fill="#6b3420" />
      <rect x="10" y="64" width="64" height="14" fill="#4a2216" />
      <rect x="10" y="64" width="64" height="2" fill="#a8873f" />
      <rect x="8" y="78" width="68" height="2" fill="#2e140c" />
      <rect x="14" y="68" width="8" height="6" fill="#2e140c" />
      <rect x="62" y="68" width="8" height="6" fill="#2e140c" />
      <rect x="6" y="66" width="4" height="10" fill="#2e140c" />
      <rect x="4" y="64" width="4" height="4" fill="#e0b85a" />
      <g className="gramophone-record">
        <polygon
          points="42,34 53,37 58,50 53,63 42,66 31,63 26,50 31,37"
          fill="#1b140d"
        />
        <polygon
          points="42,38 51,40 54,50 51,60 42,62 33,60 30,50 33,40"
          fill="#2a1f14"
        />
        <rect x="39" y="47" width="6" height="6" fill="#e0b85a" />
        <rect x="41" y="49" width="2" height="2" fill="#1b140d" />
      </g>
      <rect x="41" y="44" width="2" height="12" fill="#a8873f" />
    </svg>
  );
}

type TransportKind = 'play' | 'pause' | 'previous' | 'next';

function TransportIcon({ kind }: { kind: TransportKind }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'play' ? <polygon points="4,3 13,8 4,13" fill="currentColor" /> : null}
      {kind === 'pause' ? (
        <>
          <rect x="4" y="3" width="3" height="10" fill="currentColor" />
          <rect x="9" y="3" width="3" height="10" fill="currentColor" />
        </>
      ) : null}
      {kind === 'next' ? (
        <>
          <polygon points="3,3 10,8 3,13" fill="currentColor" />
          <rect x="11" y="3" width="3" height="10" fill="currentColor" />
        </>
      ) : null}
      {kind === 'previous' ? (
        <>
          <rect x="2" y="3" width="3" height="10" fill="currentColor" />
          <polygon points="13,3 6,8 13,13" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}
