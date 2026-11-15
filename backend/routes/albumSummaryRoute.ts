import { Router, type Request, type Response } from "express";
import { currentUserId } from "../middleware/auth.js";
import { getAlbumSummaries, type AlbumSummaryRow } from "../models/albumSummary.js";
import { decodeCursor, encodeCursor } from "../lib/albumCursor.js";
import type { ImageUrlSigner } from "../lib/imageUrlSigner.js";
import type { AppConfig } from "../config/env.js";

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

const toIso = (v: Date | string | null): string | null => {
  if (v === null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Query-string integers: digits only (no sign, decimals, arrays or whitespace). */
function parseLimit(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_PAGE_LIMIT;
  if (typeof raw !== "string" || !/^\d{1,4}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_PAGE_LIMIT ? n : null;
}

/**
 * GET /albums/summaries, mounted at /albums/summaries behind requireAuth (see app.ts).
 * The owner is ALWAYS the verified token user; no user or album id is read from the request.
 * The response is an explicit allow-list: no user_id, public_id, stored image_url or provider names.
 */
export function createAlbumSummariesRouter(config: AppConfig, signer: ImageUrlSigner) {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit);
    if (limit === null) return res.status(400).json({ error: "Invalid limit" });

    let after: { sortKey: string; id: string } | undefined;
    if (req.query.cursor !== undefined) {
      const cursor = decodeCursor(req.query.cursor);
      if (!cursor) return res.status(400).json({ error: "Invalid cursor" });
      after = { sortKey: cursor.t, id: cursor.id };
    }

    try {
      const coverLimit = config.albumCoverImages;
      const { total, rows } = await getAlbumSummaries(currentUserId(req), {
        limit: limit + 1, // one extra row only tells whether another page exists
        coverLimit,
        after,
      });

      const hasMore = rows.length > limit;
      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      const nextCursor = hasMore && last ? encodeCursor({ t: last.sortKey, id: last.id }) : null;

      const items = await Promise.all(pageRows.map((row) => toSummary(row, coverLimit, signer)));

      // Contains time-limited URLs: must not be stored by shared caches or reused after expiry.
      res.set("Cache-Control", "private, no-store");
      return res.json({ items, total, nextCursor });
    } catch (err) {
      // Never log the cursor, object keys or URLs.
      console.error("album summaries failed:", (err as { name?: string; code?: string })?.code ?? (err as Error)?.name);
      return res.status(500).json({ error: "Failed to fetch album summaries" });
    }
  });

  return router;
}

async function toSummary(row: AlbumSummaryRow, coverLimit: number, signer: ImageUrlSigner) {
  const signed = await Promise.all(
    row.covers.slice(0, coverLimit).map(async (cover) => {
      try {
        const { url, expiresAt } = await signer.getReadUrl(cover.objectKey);
        return { id: cover.id, url, expiresAt: expiresAt.toISOString() };
      } catch {
        // One failing cover must not fail the page; it is dropped and photoCount is unchanged.
        console.error("cover url signing failed");
        return null;
      }
    })
  );
  return {
    id: row.id,
    name: row.name,
    createdAt: toIso(row.createdAt),
    lastActivityAt: toIso(row.lastActivityAt),
    photoCount: row.photoCount,
    coverImages: signed.filter((c): c is NonNullable<typeof c> => c !== null),
  };
}
