const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export function cleanName(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

/** Optional text field: undefined -> undefined, null -> null, string within limit -> string, else "invalid". */
export function optionalText(v: unknown, max: number): string | null | undefined | "invalid" {
  if (v === undefined || v === null) return v;
  return typeof v === "string" && v.length <= max ? v : "invalid";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Real calendar date check: rejects 2026-02-31, 2026-13-01 and year 0000 (Date.parse alone rolls Feb 31 over to March). */
export function isRealIsoDate(v: string): boolean {
  if (!DATE_RE.test(v) || v.startsWith("0000")) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function optionalDate(v: unknown): string | null | undefined | "invalid" {
  if (v === undefined || v === null) return v;
  if (typeof v !== "string" || !isRealIsoDate(v)) return "invalid";
  return v;
}
