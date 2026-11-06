interface AudioContextConstructor {
  new (): AudioContext;
}

function constructor(): AudioContextConstructor | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  );
}

/** Creates a context synchronously, so a player gesture is not lost. */
export function createAudioContext(): AudioContext | null {
  const Constructor = constructor();
  return Constructor ? new Constructor() : null;
}

/**
 * Creates or resumes the browser audio context. Returns null when the browser
 * has no AudioContext; callers fail silently in that case.
 */
export async function openAudioContext(
  existing: AudioContext | null,
): Promise<AudioContext | null> {
  const context = existing ?? createAudioContext();
  if (!context) {
    return null;
  }
  if (context.state === 'suspended') {
    await context.resume();
  }
  return context;
}
