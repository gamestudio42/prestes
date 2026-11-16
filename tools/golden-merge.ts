/**
 * make-campaign-playable D7: re-recording one authored map's determinism
 * goldens. Only that map's 3v3 (and mixed-roster) entries change; the other
 * maps' entries and the base scenario hash are kept.
 */
export interface DeterminismGolden {
  seed: number;
  ticks: number;
  hash: string;
  battleMaps?: Partial<Record<string, string>>;
  mixedRosters?: Partial<Record<string, string>>;
  reason?: string;
}

export function mergeMapGolden(
  golden: DeterminismGolden,
  map: string,
  hashes: { battle: string; mixed?: string },
  reason: string,
): DeterminismGolden {
  return {
    ...golden,
    battleMaps: { ...golden.battleMaps, [map]: hashes.battle },
    ...(hashes.mixed === undefined ? {} : { mixedRosters: { ...golden.mixedRosters, [map]: hashes.mixed } }),
    reason: `${map}: ${reason}`,
  };
}
