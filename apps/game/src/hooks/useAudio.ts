import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/mixer';
import { RecordedGunshotOutput, ShotAudio } from '../audio/ShotAudio';
import { loadAudioSettings, saveAudioSettings } from '../storage';

/** Shot audio with persisted mute and volume. */
export function useAudio() {
  const [audioMuted, setAudioMuted] = useState(() => loadAudioSettings().muted);
  const [audioVolume, setAudioVolume] = useState(() => loadAudioSettings().volume);
  const audioRef = useRef<ShotAudio | null>(null);

  useEffect(() => {
    // One context and mixer for the battle's sound (ambient-sound-and-voices 1.1).
    const engine = new AudioEngine();
    const audio = new ShotAudio(new RecordedGunshotOutput('./audio/', engine), {
      muted: audioMuted,
      volume: audioVolume,
    });
    audioRef.current = audio;
    return () => {
      audio.dispose();
      engine.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(audioMuted);
    saveAudioSettings({ muted: audioMuted, volume: audioVolume });
  }, [audioMuted, audioVolume]);

  const handleToggleAudio = (): void => {
    setAudioMuted((value) => !value);
  };

  const handleAudioVolume = (value: number): void => {
    setAudioVolume(Math.max(0, Math.min(1, value)));
  };

  return { audioRef, audioMuted, audioVolume, handleToggleAudio, handleAudioVolume };
}
