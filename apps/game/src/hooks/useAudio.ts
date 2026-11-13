import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/mixer';
import { audioSettings, useAudioSettings } from '../audio/settings-store';
import { RecordedGunshotOutput, ShotAudio } from '../audio/ShotAudio';

/**
 * The battle's sound: one engine and mixer, the shots on its effects bus,
 * and the player's mute and channel volumes (ambient-sound-and-voices 2.1)
 * applied as they change.
 */
export function useAudio() {
  const settings = useAudioSettings();
  const audioRef = useRef<ShotAudio | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    // One context and mixer for the battle's sound (ambient-sound-and-voices 1.1).
    const engine = new AudioEngine();
    const audio = new ShotAudio(new RecordedGunshotOutput('./audio/', engine), { muted: audioSettings.get().muted });
    engineRef.current = engine;
    audioRef.current = audio;
    if (import.meta.env.DEV) {
      (window as unknown as { __prestesAudio?: unknown }).__prestesAudio = {
        levels: () => {
          const mixer = engine.mixer;
          return mixer
            ? { ready: true, muted: mixer.master.gain.value === 0, effects: mixer.volume('effects'), ambience: mixer.volume('ambience'), voices: mixer.volume('voices') }
            : { ready: false };
        },
      };
    }
    return () => {
      audio.dispose();
      engine.dispose();
      audioRef.current = null;
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(settings.muted);
    engineRef.current?.setLevels(settings.muted, settings);
  }, [settings]);

  return {
    audioRef,
    audioMuted: settings.muted,
    handleToggleAudio: audioSettings.toggleMuted,
  };
}
