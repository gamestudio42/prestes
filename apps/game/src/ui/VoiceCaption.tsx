import { useSyncExternalStore } from 'react';
import { translate, type Locale } from '@prestes/content';
import { captionsOn, useAudioSettings } from '../audio/settings-store';
import { voiceCaptions } from '../audio/voice-controller';

/**
 * ambient-sound-and-voices 5.5: the line being said, with its speaker, while
 * it plays. On by default in English, off in Portuguese (the spoken language);
 * the options compass turns it on or off.
 */
export function VoiceCaption({ locale }: { locale: Locale }) {
  const settings = useAudioSettings();
  const caption = useSyncExternalStore(voiceCaptions.subscribe, voiceCaptions.get, voiceCaptions.get);
  // Shown even when muted: a player who cannot hear may mute the game.
  if (!caption || !captionsOn(settings, locale)) return null;
  const speaker = caption.kind === 'order' ? 'voice.speaker.commander' : caption.enemy ? 'voice.speaker.enemy' : 'voice.speaker.soldier';
  return (
    <div className={`voice-caption${caption.enemy ? ' is-enemy' : ''}`} role="status" aria-live="polite" data-testid="voice-caption">
      <span className="voice-caption-speaker">{translate(locale, speaker)}</span>
      <span className="voice-caption-text">{locale === 'en' ? caption.take.en : caption.take.pt}</span>
    </div>
  );
}
