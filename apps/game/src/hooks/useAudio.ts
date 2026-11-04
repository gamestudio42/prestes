import { useEffect, useRef, useState } from 'react';
import { RecordedGunshotOutput, ShotAudio } from '../audio/ShotAudio';
import { loadAudioSettings, saveAudioSettings } from '../storage';

/** Shot audio with persisted mute and volume. */
export function useAudio() {
  const [audioMuted, setAudioMuted] = useState(() => loadAudioSettings().muted);
  const [audioVolume, setAudioVolume] = useState(() => loadAudioSettings().volume);
  const audioRef = useRef<ShotAudio | null>(null);

  useEffect(() => {
    const audio = new ShotAudio(new RecordedGunshotOutput(), {
      muted: audioMuted,
      volume: audioVolume,
    });
    audioRef.current = audio;
    return () => {
      audio.dispose();
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
