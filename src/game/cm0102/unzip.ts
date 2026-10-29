// Minimal .zip reader (stored and deflated entries) so a zipped CM Data folder can be imported in one go.

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Files in the archive, keyed by lower-case file name (folders dropped). */
export async function unzip(buf: Uint8Array, want: (name: string) => boolean): Promise<Record<string, Uint8Array>> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // End of central directory: last 0x06054b50 signature
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: Record<string, Uint8Array> = {};
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const full = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    const name = full.split('/').pop()!.toLowerCase();
    if (!name || !want(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = buf.subarray(start, start + size);
    if (method === 0) out[name] = data;
    else if (method === 8) out[name] = await inflate(data);
    else throw new Error(`Unsupported compression in ${name}`);
  }
  return out;
}
