// The built-in CM 01/02 database ships compressed and scrambled, so the published file isn't readable or
// reusable as it stands. (Anything a browser downloads can be recovered by someone determined; this stops casual copying.)
import type { CmWorld } from './parse';

/** XOR with a fixed keystream: the same call scrambles and unscrambles. */
export function scramble(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(b.length);
  let x = 0x9e3779b9 ^ 0x0102;
  for (let i = 0; i < b.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    out[i] = b[i] ^ (x & 0xff) ^ ((i * 31) & 0xff);
  }
  return out;
}

/** Built-in database file (base64 text, so any host serves it) → world (gzip inside the scramble). */
export async function unpackWorld(text: string): Promise<CmWorld> {
  const bin = atob(text.trim());
  const raw = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
  const gz = scramble(raw);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text()) as CmWorld;
}
