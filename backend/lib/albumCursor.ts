import { isUuid } from "./validation.js";

export interface AlbumCursor {
  /** Microsecond-precision UTC ISO timestamp of the ordering key, e.g. 2026-11-12T18:40:02.654321Z. */
  t: string;
  id: string;
}

const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
export const MAX_CURSOR_LENGTH = 256;

/** The cursor is opaque to clients and carries no authority: it only repositions within the caller's own rows. */
export function encodeCursor(c: AlbumCursor): string {
  return Buffer.from(JSON.stringify({ t: c.t, id: c.id }), "utf8").toString("base64url");
}

/** Returns null for anything malformed, tampered or not a real timestamp/UUID. */
export function decodeCursor(value: unknown): AlbumCursor | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_CURSOR_LENGTH) return null;
  if (!B64URL_RE.test(value)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { t, id } = parsed as Record<string, unknown>;
  if (typeof t !== "string" || !TS_RE.test(t) || !isUuid(id)) return null;
  // Reject calendar-invalid values (e.g. month 13, Feb 31) that PostgreSQL would turn into a 500.
  const d = new Date(`${t.slice(0, 19)}Z`);
  if (t.startsWith("0000") || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) !== t.slice(0, 19)) return null;
  return { t, id };
}
