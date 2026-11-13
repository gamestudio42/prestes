import { useCallback, useEffect, useRef } from 'react';
import { AmbienceController } from '../audio/ambience-controller';
import { AudioEngine } from '../audio/mixer';
import { audioSettings, useAudioSettings } from '../audio/settings-store';
import { RecordedGunshotOutput, ShotAudio, type AudioListener } from '../audio/ShotAudio';

/**
 * The battle's sound: one engine and mixer, the shots on its effects bus,
 * and the player's mute and channel volumes (ambient-sound-and-voices 2.1)
 * applied as they change.
 */
export function useAudio() {
  const settings = useAudioSettings();
  const audioRef = useRef<ShotAudio | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const ambienceRef = useRef<AmbienceController | null>(null);

  useEffect(() => {
    // One context and mixer for the battle's sound (ambient-sound-and-voices 1.1).
    const engine = new AudioEngine();
    const audio = new ShotAudio(new RecordedGunshotOutput('./audio/', engine), { muted: audioSettings.get().muted });
    // ambient-sound-and-voices 3.2: the air of the place and the hour.
    const ambience = new AmbienceController(engine);
    engineRef.current = engine;
    audioRef.current = audio;
    ambienceRef.current = ambience;
    if (import.meta.env.DEV) {
      (window as unknown as { __prestesAudio?: unknown }).__prestesAudio = {
        levels: () => {
          const mixer = engine.mixer;
          return mixer
            ? { ready: true, muted: mixer.master.gain.value === 0, effects: mixer.volume('effects'), ambience: mixer.volume('ambience'), voices: mixer.volume('voices') }
            : { ready: false };
        },
        ambience: () => ambience.state(),
      };
    }
    return () => {
      ambience.dispose();
      audio.dispose();
      engine.dispose();
      audioRef.current = null;
      engineRef.current = null;
      ambienceRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(settings.muted);
    engineRef.current?.setLevels(settings.muted, settings);
  }, [settings]);

  /** Every frame, from the battle view: where the player hears from. */
  const handleAudioView = useCallback((listener: AudioListener) => {
    audioRef.current?.setListener(listener);
    ambienceRef.current?.setListener(listener);
  }, []);

  return {
    audioRef,
    handleAudioView,
    audioMuted: settings.muted,
    handleToggleAudio: audioSettings.toggleMuted,
  };
}
