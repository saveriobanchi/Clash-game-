/** Uniform [0,1). Uses the platform CSPRNG in play; tests can swap in a seeded one. */
let source: () => number = () => {
  const b = new Uint32Array(2);
  crypto.getRandomValues(b);
  return (b[0] * 2 ** 21 + (b[1] >>> 11)) / 2 ** 53;
};
export const rnd = (): number => source();
export function setRng(f: () => number): void { source = f; }
/** Mulberry32 — deterministic, for tests and simulations. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (n: number): number => Math.floor(rnd() * n);
export const pick = <T>(arr: readonly T[]): T => arr[randInt(arr.length)];
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
/** Picks an index by weight. */
export function weighted(weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let r = rnd() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
