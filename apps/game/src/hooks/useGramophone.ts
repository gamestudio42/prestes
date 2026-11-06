import { useCallback, useEffect, useRef, useState } from 'react';
import { Gramophone, type GramophoneState } from '../audio/Gramophone';
import { HtmlGramophoneOutput } from '../audio/gramophone-output';
import { clampTrackIndex, GRAMOPHONE_TRACKS } from '../audio/gramophone-tracks';
import { loadGramophoneTrack, saveGramophoneTrack } from '../storage';

export interface UseGramophoneOptions {
  muted: boolean;
  /** Called when Play is pressed while game sound is muted. */
  onEnableSound: () => void;
}

/**
 * The menu gramophone's React side: creates one engine while the start screen
 * is mounted, mirrors its state, persists the selected track, and starts the
 * music on the first menu gesture (never against an explicit mute).
 */
export function useGramophone({ muted, onEnableSound }: UseGramophoneOptions) {
  const [state, setState] = useState<GramophoneState>(() => ({
    trackIndex: clampTrackIndex(loadGramophoneTrack()),
    playing: false,
    loading: false,
    started: false,
    error: false,
    changeNonce: 0,
  }));
  const engineRef = useRef<Gramophone | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const engine = new Gramophone({
      output: new HtmlGramophoneOutput({ muted: mutedRef.current }),
      baseUrl: import.meta.env.BASE_URL,
      startIndex: loadGramophoneTrack(),
      muted: mutedRef.current,
      onState: setState,
    });
    engineRef.current = engine;
    setState(engine.getState());
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    saveGramophoneTrack(state.trackIndex);
  }, [state.trackIndex]);

  useEffect(() => {
    if (state.started || muted) return;
    const start = (event: Event): void => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-no-autoplay]')) return;
      window.removeEventListener('pointerdown', start, true);
      window.removeEventListener('keydown', start, true);
      void engineRef.current?.play();
    };
    window.addEventListener('pointerdown', start, true);
    window.addEventListener('keydown', start, true);
    return () => {
      window.removeEventListener('pointerdown', start, true);
      window.removeEventListener('keydown', start, true);
    };
  }, [state.started, muted]);

  const handlePlayPause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const current = engine.getState();
    if (current.playing || current.loading) {
      engine.pause();
      return;
    }
    if (muted) {
      onEnableSound();
      engine.setMuted(false);
    }
    void engine.play();
  }, [muted, onEnableSound]);

  const handleNext = useCallback(() => {
    engineRef.current?.next();
  }, []);

  const handlePrevious = useCallback(() => {
    engineRef.current?.previous();
  }, []);

  return {
    track: GRAMOPHONE_TRACKS[state.trackIndex] ?? GRAMOPHONE_TRACKS[0]!,
    total: GRAMOPHONE_TRACKS.length,
    state,
    handlePlayPause,
    handleNext,
    handlePrevious,
  };
}
