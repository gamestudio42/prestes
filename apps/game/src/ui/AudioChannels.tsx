import type { MessageKey } from '@prestes/content';
import { audioSettings, useAudioSettings } from '../audio/settings-store';
import { BUSES } from '../audio/mixer';
import '../styles/audio-channels.css';

/**
 * ambient-sound-and-voices 2.1: the three channel volumes as sliders, in the
 * battle's sound panel and in the options compass.
 */
export function AudioChannels({
  t,
  className,
  rowClassName,
}: {
  t: (key: MessageKey) => string;
  className?: string;
  rowClassName?: string;
}) {
  const settings = useAudioSettings();
  return (
    <div className={className} data-testid="audio-channels">
      {BUSES.map((bus) => {
        const label = t(`audio.channel.${bus}` as MessageKey);
        const value = Math.round(settings[bus] * 100);
        return (
          <label key={bus} className={rowClassName}>
            <span>{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              aria-label={label}
              aria-valuetext={`${value}%`}
              onChange={(event) => audioSettings.setChannel(bus, Number(event.target.value) / 100)}
              data-testid={`audio-${bus}`}
            />
          </label>
        );
      })}
    </div>
  );
}
