/** Compute a deterministic deck ID from mainboard entries (djb2 hash → 8-char hex). */
export function computeDeckId(mainboard: { name: string; quantity: number }[]): string {
  const normalized = [...mainboard]
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map((e) => `${e.quantity}:${e.name.toLowerCase()}`)
    .join('|');

  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
