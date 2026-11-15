import fs from "node:fs/promises";

export type DetectedImageType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Number of leading bytes needed to recognise every supported format. */
export const SIGNATURE_BYTES = 12;

/**
 * Recognises JPEG, PNG, GIF and WebP from their leading bytes ("magic numbers").
 * Returns null for anything else. This is a content check, not a full decode: it stops
 * trivial spoofing of the client-declared type but not polyglot files.
 */
export function detectImageType(head: Uint8Array): DetectedImageType | null {
  const at = (i: number) => head[i];
  const ascii = (start: number, text: string) =>
    head.length >= start + text.length && [...text].every((c, i) => head[start + i] === c.charCodeAt(0));

  if (head.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (
    head.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b)
  ) {
    return "image/png";
  }
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  return null;
}

/** Reads only the first bytes of a file (never the whole upload). Returns null on any I/O error. */
export async function readHead(path: string, bytes = SIGNATURE_BYTES): Promise<Uint8Array | null> {
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(path, "r");
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

/** True when the stored temp file's content is one of the supported image formats. */
export async function hasImageSignature(path: string): Promise<boolean> {
  const head = await readHead(path);
  return head !== null && detectImageType(head) !== null;
}
