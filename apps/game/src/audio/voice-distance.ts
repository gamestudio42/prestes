/**
 * The voices heard across a field, not at the microphone (the owner,
 * 2026-11-16: "as vozes estão muito vivas, deveria parecer um pouco mais
 * longe"). Every take loses the chest of a close voice (a high-pass), the
 * air of its highs (a low-pass) and gains a share of open-air echo; a
 * call-out heard thin, so far off, loses more highs and gains more echo.
 * Order lines and answers sit at a fixed, middle distance. Pure numbers here;
 * the voice output builds the nodes.
 */

export interface VoiceDistance {
  /** Low-pass cutoff (Hz). */
  lowpass: number;
  /** High-pass cutoff (Hz). */
  highpass: number;
  /** The direct sound's share. */
  dry: number;
  /** The echo's share. */
  wet: number;
}

/** Orders and answers: a few dozen metres off, over the noise of the fight. */
export const ORDER_DISTANCE: VoiceDistance = { lowpass: 4200, highpass: 220, dry: 0.8, wet: 0.28 };
/** A call-out at the listening point… */
const NEAR: VoiceDistance = { lowpass: 3600, highpass: 240, dry: 0.78, wet: 0.32 };
/** …and one at the edge of hearing. */
const FAR: VoiceDistance = { lowpass: 1700, highpass: 320, dry: 0.55, wet: 0.6 };

/** Length of the open-air echo (s). */
export const ECHO_SECONDS = 1.1;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far a take sounds: by its priority, and for a call-out by the gain the nearness rule gave it. */
export function voiceDistance(priority: boolean, gain: number): VoiceDistance {
  if (priority) return ORDER_DISTANCE;
  // Gain falls with the square of nearness: its root reads as distance again.
  const far = 1 - Math.sqrt(Math.max(0, Math.min(1, gain)));
  return {
    lowpass: Math.round(mix(NEAR.lowpass, FAR.lowpass, far)),
    highpass: Math.round(mix(NEAR.highpass, FAR.highpass, far)),
    dry: mix(NEAR.dry, FAR.dry, far),
    wet: mix(NEAR.wet, FAR.wet, far),
  };
}

/** A stereo open-air echo: a soft early bounce, then noise that dies away. */
export function echoImpulse(context: BaseAudioContext, random: () => number = Math.random): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.round(rate * ECHO_SECONDS);
  const impulse = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    // A bounce off the ground and trees, a few tens of milliseconds late.
    const early = Math.round(rate * (0.028 + channel * 0.007));
    for (let i = 0; i < length; i += 1) {
      const t = i / rate;
      const tail = (random() * 2 - 1) * Math.exp(-t * 5.5) * (i < early ? 0.15 : 0.5);
      data[i] = tail + (i === early ? 0.45 : 0);
    }
  }
  return impulse;
}
