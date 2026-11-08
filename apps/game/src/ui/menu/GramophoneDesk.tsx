import { translate, type Locale, type MessageKey } from '@prestes/content';
import type { GramophoneState } from '../../audio/Gramophone';
import { GRAMOPHONE_TRACKS, type GramophoneTrack } from '../../audio/gramophone-tracks';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface GramophoneDeskProps {
  locale: Locale;
  open: boolean;
  track: GramophoneTrack;
  total: number;
  state: GramophoneState;
  muted: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}

/**
 * The gramophone as a desk object. Closed, it is just the cabinet and horn with
 * its record. Opening it lays out a centered screen with the larger machine,
 * the current record and a rack of records with the transport controls.
 */
export function GramophoneDesk({
  locale,
  open,
  track,
  total,
  state,
  muted,
  onPlayPause,
  onNext,
  onPrevious,
  onSelect,
}: GramophoneDeskProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const status = state.playing ? 'playing' : state.loading ? 'loading' : 'paused';
  const hint = state.error
    ? t('gramophone.unavailable')
    : muted
      ? t('gramophone.mutedHint')
      : !state.started && !state.playing
        ? t('gramophone.startHint')
        : null;

  if (!open) {
    return (
      <div
        className="desk-gramophone-closed desk-art-box"
        style={deskArtStyle(DESK_ART.gramophoneBody)}
        {...deskArtData(DESK_ART.gramophoneBody)}
        data-testid="gramophone"
        data-playing={state.playing}
        data-state={status}
        aria-label={t('gramophone.title')}
      >
        <div className="desk-gramophone-art desk-gramophone-art-closed">
          <img
            className="desk-gramophone-body"
            src={DESK_ART.gramophoneBody.src}
            width={DESK_ART.gramophoneBody.width}
            height={DESK_ART.gramophoneBody.height}
            alt=""
            draggable={false}
          />
          <img
            className="desk-gramophone-grooves"
            src={DESK_ART.gramophoneGrooves.src}
            width={DESK_ART.gramophoneGrooves.width}
            height={DESK_ART.gramophoneGrooves.height}
            alt=""
            draggable={false}
          />
        </div>
        <span className="desk-object-label">{t('gramophone.title')}</span>
      </div>
    );
  }

  return (
    <section
      className="desk-gramophone-screen"
      data-testid="gramophone"
      data-playing={state.playing}
      data-state={status}
      aria-label={t('gramophone.title')}
      data-no-autoplay
    >
      <div className="desk-gramophone-stage">
        <div className="desk-gramophone-art desk-gramophone-art-open">
          <img
            className="desk-gramophone-body desk-gramophone-body-open"
            src={DESK_ART.gramophoneBody.src}
            width={DESK_ART.gramophoneBody.width}
            height={DESK_ART.gramophoneBody.height}
            alt=""
            draggable={false}
          />
          <img
            className="desk-gramophone-grooves"
            src={DESK_ART.gramophoneGrooves.src}
            width={DESK_ART.gramophoneGrooves.width}
            height={DESK_ART.gramophoneGrooves.height}
            alt=""
            draggable={false}
          />
        </div>
        <div className="desk-gramophone-now">
          <p className="gramophone-kicker">{t('gramophone.title')}</p>
          <p className="gramophone-track" data-testid="gramophone-title">
            {track.title}
          </p>
          <p className="gramophone-meta">
            {track.composer} ·{' '}
            {t('gramophone.trackCount', { current: state.trackIndex + 1, total })}
          </p>
          <dl className="desk-gramophone-facts">
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
          <p className="desk-gramophone-dp">
            {t('gramophone.publicDomain', { year: track.publicDomainYear })}
          </p>
          <a
            className="desk-gramophone-source"
            href={track.source ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            {t('gramophone.source')}
          </a>
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
        </div>
      </div>

      <div className="desk-gramophone-rack">
        <p className="desk-gramophone-rack-title">{t('gramophone.records')}</p>
        <ol className="desk-gramophone-tracks">
          {GRAMOPHONE_TRACKS.map((item, index) => {
            const active = index === state.trackIndex;
            return (
              <li key={`${item.title}-${index}`}>
                <button
                  type="button"
                  className={`desk-gramophone-track ${active ? 'active' : ''}`}
                  onClick={() => onSelect(index)}
                  aria-pressed={active}
                  data-testid={`gramophone-track-${index}`}
                >
                  <img
                    className="desk-gramophone-disc"
                    src={DESK_ART.gramophoneRecord.src}
                    width={DESK_ART.gramophoneRecord.width}
                    height={DESK_ART.gramophoneRecord.height}
                    alt=""
                    draggable={false}
                  />
                  <span className="desk-gramophone-track-text">
                    <span className="desk-gramophone-track-title">{item.title}</span>
                    <span className="desk-gramophone-track-meta">
                      {item.composer} · {item.year}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
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
