/** FNV-1a 32-bit hash, returned as eight lowercase hex digits. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function hashString(input: string): string {
  return fnv1a(input);
}

export function hashNumbers(values: readonly number[]): string {
  return fnv1a(values.map((value) => Math.trunc(value).toString()).join(','));
}
